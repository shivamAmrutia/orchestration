import {
  TaskState,
  WorkflowState
} from "./workflows.types.js";


import prisma from "../../../prisma/client.js";
import { enqueueExecution } from "../../queue/executionQueue.js";

/**
 * Creates a workflow definition with tasks and dependencies.
 * Enforces DAG correctness and transactional safety.
 */
export async function createWorkflow(input) {
  const { name, description, tasks} = input;
  
  if (!name) {
    throw new Error("Workflow name is required");
  }

  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error("Workflow must have at least one task");
  }

  // 1. Validate unique task names
  const taskNames = tasks.map(t => t.name);
  const uniqueNames = new Set(taskNames);
  if (uniqueNames.size !== taskNames.length) {
    throw new Error("Task names must be unique within a workflow");
  }

  // 2. Validate dependencies reference valid tasks and build dependencies map
  
  const dependencies = {};

  for (const task of tasks) {
    for (const dep of task.dependencies || []) {

      dependencies[task.name] ? dependencies[task.name].push(dep) : dependencies[task.name] = [dep];

      if (!uniqueNames.has(dep)) {
        throw new Error(
          `Invalid dependency: task "${task.name}" depends on unknown task "${dep}"`
        );
      }
      if (dep === task.name) {
        throw new Error("Task cannot depend on itself");
      }
    }
  }

  // 3. Validate DAG (cycle detection)
  validateNoCycles(taskNames, dependencies);

  // 4. Persist everything atomically
  return prisma.$transaction(async (tx) => {
    const workflow = await tx.workflows.create({
      data: { name, description }
    });

    // Map task name → task id
    const taskIdMap = new Map();

    for (const task of tasks) {
      const created = await tx.tasks.create({
        data: {
          workflowId: workflow.id,
          name: task.name,
          type: task.type,
          config: task.config
        }
      });
      taskIdMap.set(task.name, created.id);
    }

    // Create dependency edges
    for (const elem in dependencies) {
      for (const dep of dependencies[elem]) {
        await tx.taskDependency.create({
          data: {
            taskId: taskIdMap.get(elem),
            dependsOnTaskId: taskIdMap.get(dep)
          }
        });
      }
    }

    return workflow;
  });
}

function validateNoCycles(taskNames, dependencies) {
  const graph = new Map();
  const visiting = new Set();
  const visited = new Set();

  taskNames.forEach(name => graph.set(name, []));

  for (const elem in dependencies) { 
    graph.get(elem).push(...dependencies[elem]);
  }

  function dfs(node) {
    if (visiting.has(node)) {
      throw new Error("Workflow contains cyclic dependencies");
    }
    if (visited.has(node)) return;

    visiting.add(node);
    for (const neighbor of graph.get(node)) {
      dfs(neighbor);
    }
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of taskNames) {
    dfs(node);
  }
}


export async function getWorkflow(workflowId) {
  if (!workflowId) {
    throw new Error("workflowId is required");
  }

  const workflow = await prisma.workflows.findUnique({
    where: { id: workflowId },
    include: {
      tasks: {
        include: {
          dependencies: {
            include: {
              dependsOn: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!workflow) {
    throw new Error("Workflow not found");
  }

  return normalizeWorkflow(workflow);
}

function normalizeWorkflow(workflow) {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    version: workflow.version,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
    tasks: workflow.tasks.map(task => ({
      id: task.id,
      name: task.name,
      type: task.type,
      config: task.config,
      dependsOn: task.dependencies.map(dep => ({
        id: dep.dependsOn.id,
        name: dep.dependsOn.name
      }))
    }))
  };
}


export async function listWorkflows({
  limit = 20,
  offset = 0
} = {}) {
  const workflows = await prisma.workflows.findMany({
    take: limit,
    skip: offset,
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      name: true,
      description: true,
      version: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return workflows;
}


export async function runWorkflow(workflowId, input = null, options = {}) {
  const { callbackUrl, skipQueue = false } = options;

  const executionId = await prisma.$transaction(async (tx) => {
    const workflow = await tx.workflows.findUnique({
      where: { id: workflowId },
      include: {
        tasks: {
          include: {
            dependencies: true
          }
        }
      }
    });

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const execution = await tx.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        status: WorkflowState.RUNNING,
        input,
        callbackUrl: callbackUrl ?? null
      }
    });

    for (const task of workflow.tasks) {
      await tx.taskExecution.create({
        data: {
          workflowExecutionId: execution.id,
          taskId: task.id,
          state: TaskState.PENDING,
          maxRetries: task.config?.maxRetries ?? 3
        }
      });
    }

    return execution.id;
  });

  if (!skipQueue) {
    await enqueueExecution(executionId);
  }

  return executionId;
}


/**
 * Fetch a workflow execution along with all task executions
 */
export async function getWorkflowExecution(executionId) {
  if (!executionId) {
    throw new Error("executionId is required");
  }

  const execution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: {
      workflow: true, // optional, if you want workflow metadata
      taskExecutions: {
        include: {
          task: {
            select: {
              name: true,
              type: true,
              config: true
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!execution) {
    throw new Error("Workflow execution not found");
  }

  return normalizeExecution(execution);
}

export async function finalizeWorkflowExecution(executionId, status) {
  if (!["COMPLETED", "FAILED"].includes(status)) {
    return null;
  }

  return prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status,
      completedAt: new Date()
    }
  });
}

function normalizeExecution(execution) {
  return {
    id: execution.id,
    workflowId: execution.workflowId,
    workflowName: execution.workflow?.name,
    status: execution.status,
    input: execution.input,
    callbackUrl: execution.callbackUrl,
    startedAt: execution.startedAt,
    completedAt: execution.completedAt,
    tasks: execution.taskExecutions.map(te => ({
      id: te.id,
      taskId: te.taskId,
      name: te.task.name,
      type: te.task.type,
      config: te.task.config,
      state: te.state,
      retryCount: te.retryCount,
      maxRetries: te.maxRetries,
      nextRetryAt: te.nextRetryAt,
      startedAt: te.startedAt,
      completedAt: te.completedAt,
      error: te.error,
      output: te.output
    }))
  };
}

export async function getAllExecutionsForWorkflow(workflowId) {
  if (!workflowId) {
    throw new Error("workflowId is required");
  }

  const executions = await prisma.workflowExecution.findMany({
    where: { workflowId: workflowId },
    include: {
      workflow: true, // optional, if you want workflow metadata
      taskExecutions: {
        include: {
          task: {
            select: {
              name: true,
              type: true,
              config: true
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  return executions.map(normalizeExecution);
}

export async function getRunnableTasks(executionId, now = new Date()) {
  if (!executionId) throw new Error("executionId is required");

  const workflowExecution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    select: { id: true, input: true }
  });

  if (!workflowExecution) {
    throw new Error("Workflow execution not found");
  }

  // 1. Fetch all task executions + their dependencies
  const taskExecutions = await prisma.taskExecution.findMany({
    where: { workflowExecutionId: executionId },
    include: {
      task: {
        include: {
          dependencies: {
            include: {
              dependsOn: true
            }
          }
        }
      }
    }
  });


  const runnable = [];

  for (const te of taskExecutions) {
    if (te.state === TaskState.PENDING) {
      // Check if all dependencies completed
      const depsCompleted = te.task.dependencies.every(dep => {
        const depExecution = taskExecutions.find(
          d => d.taskId === dep.dependsOnTaskId
        );
        return depExecution?.state === TaskState.COMPLETED;
      });

      if (depsCompleted) {
        runnable.push(te);
      }
    } else if (
      te.state === TaskState.RETRYING &&
      te.nextRetryAt &&
      te.nextRetryAt <= now
    ) {
      // Retryable task is ready
      runnable.push(te);
    }
  }

  return runnable.map(te => ({
    workflowExecutionId: executionId,
    taskExecutionId: te.id,
    taskId: te.taskId,
    name: te.task.name,
    type: te.task.type,
    config: te.task.config,
    workflowInput: workflowExecution.input,
    upstreamOutputs: te.task.dependencies.reduce((acc, dep) => {
      const depExecution = taskExecutions.find(d => d.taskId === dep.dependsOnTaskId);
      acc[dep.dependsOn.name] = depExecution?.output ?? null;
      return acc;
    }, {}),
    state: te.state,
    retryCount: te.retryCount,
    maxRetries: te.maxRetries,
    nextRetryAt: te.nextRetryAt
  }));
}

export async function markTaskRunning(taskExecutionId) {
  return prisma.$transaction(async (tx) => {
    const te = await tx.taskExecution.findUnique({
      where: { id: taskExecutionId },
      include: { task: { include: { dependencies: true } } }
    });

    if (!te) throw new Error("Task execution not found");

    if (te.state !== TaskState.PENDING && te.state !== TaskState.RETRYING) {
      throw new Error(`Cannot run task in state ${te.state}`);
    }

    // Update state atomically
    const updated = await tx.taskExecution.update({
      where: { id: taskExecutionId },
      data: {
        state: TaskState.RUNNING,
        startedAt: new Date()
      }
    });

    return updated;
  });
}

export async function completeTask(taskExecutionId, output = null) {
  return prisma.taskExecution.update({
    where: { id: taskExecutionId },
    data: {
      state: TaskState.COMPLETED,
      completedAt: new Date(),
      output
    }
  });
}

async function blockDownstreamTasks(tx, workflowExecutionId, failedTaskId) {
  const taskExecutions = await tx.taskExecution.findMany({
    where: { workflowExecutionId },
    include: {
      task: {
        include: { dependencies: true }
      }
    }
  });

  const queue = [failedTaskId];
  const visited = new Set();

  while (queue.length) {
    const blockedTaskId = queue.shift();
    if (visited.has(blockedTaskId)) continue;
    visited.add(blockedTaskId);

    for (const te of taskExecutions) {
      const dependsOnBlocked = te.task.dependencies.some(
        dep => dep.dependsOnTaskId === blockedTaskId
      );

      if (
        dependsOnBlocked &&
        (te.state === TaskState.PENDING || te.state === TaskState.RETRYING)
      ) {
        await tx.taskExecution.update({
          where: { id: te.id },
          data: {
            state: TaskState.BLOCKED,
            completedAt: new Date(),
            error: "Blocked due to upstream failure"
          }
        });
        queue.push(te.taskId);
      }
    }
  }
}

export async function failTask(taskExecutionId, errorMessage, retryDelayMs = 10000) {
  return prisma.$transaction(async (tx) => {
    const te = await tx.taskExecution.findUnique({
      where: { id: taskExecutionId }
    });

    if (!te) throw new Error("Task execution not found");

    const nextRetryCount = te.retryCount + 1;

    if (nextRetryCount > te.maxRetries - 1) {
      // Terminal failure
      const failed = await tx.taskExecution.update({
        where: { id: taskExecutionId },
        data: {
          state: TaskState.FAILED,
          completedAt: new Date(),
          retryCount: nextRetryCount,
          error: errorMessage
        }
      });

      await blockDownstreamTasks(tx, te.workflowExecutionId, te.taskId);
      return failed;
    } else {
      // Schedule retry
      return tx.taskExecution.update({
        where: { id: taskExecutionId },
        data: {
          state: TaskState.RETRYING,
          retryCount: nextRetryCount,
          nextRetryAt: new Date(Date.now() + retryDelayMs),
          error: errorMessage
        }
      });
    }
  });
}


export async function updateWorkflowExecutionStatus(executionId) {
  if (!executionId) throw new Error("executionId is required");

  // 1. Fetch all task executions for this workflow execution
  const tasks = await prisma.taskExecution.findMany({
    where: { workflowExecutionId: executionId },
    select: { state: true }
  });

  if (!tasks.length) {
    throw new Error("No tasks found for this workflow execution");
  }

  // 2. Determine workflow state
  let newState = WorkflowState.COMPLETED; // optimistic default

  const states = tasks.map(t => t.state);

  if (states.some(s => s === TaskState.FAILED)) {
    newState = WorkflowState.FAILED;
  }
  else if (states.some(s => s === TaskState.RUNNING || s === TaskState.RETRYING || s === TaskState.PENDING)) {
    newState = WorkflowState.RUNNING;
  }
  else {
    // All tasks are COMPLETED or BLOCKED → still COMPLETED
    newState = WorkflowState.COMPLETED;
  }

  // 3. Update workflow execution
  const updated = await prisma.workflowExecution.update({
    where: { id: executionId },
    data: { status: newState }
  });

  return updated;
}
