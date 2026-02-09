import {
  TaskState,
  WorkflowState
} from "./workflows.types.js";


import prisma from "../../db/client.js";

/**
 * Creates a workflow definition with tasks and dependencies.
 * Enforces DAG correctness and transactional safety.
 */
export async function createWorkflow(input) {
  const { name, description, tasks, dependencies = [] } = input;

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

  // 2. Validate dependencies reference valid tasks
  for (const dep of dependencies) {
    if (!uniqueNames.has(dep.from) || !uniqueNames.has(dep.to)) {
      throw new Error(
        `Invalid dependency: ${dep.from} depends on ${dep.to}`
      );
    }
    if (dep.from === dep.to) {
      throw new Error("Task cannot depend on itself");
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
    for (const dep of dependencies) {
      await tx.taskDependency.create({
        data: {
          taskId: taskIdMap.get(dep.from),
          dependsOnTaskId: taskIdMap.get(dep.to)
        }
      });
    }

    return workflow;
  });
}

function validateNoCycles(taskNames, dependencies) {
  const graph = new Map();
  const visiting = new Set();
  const visited = new Set();

  taskNames.forEach(name => graph.set(name, []));

  for (const { from, to } of dependencies) {
    graph.get(from).push(to);
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


export async function runWorkflow(workflowId) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch workflow with tasks + dependencies
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

    // 2. Create workflow execution
    const execution = await tx.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        status: WorkflowState.RUNNING
      }
    });

    // 3. Create task execution records
    for (const task of workflow.tasks) {
      const hasDependencies = task.dependencies.length > 0;

      await tx.taskExecution.create({
        data: {
          workflowExecutionId: execution.id,
          taskId: task.id,
          state: hasDependencies
            ? TaskState.BLOCKED
            : TaskState.PENDING
        }
      });
    }

    return execution;
  });
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

function normalizeExecution(execution) {
  return {
    id: execution.id,
    workflowId: execution.workflowId,
    workflowName: execution.workflow?.name,
    status: execution.status,
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
      error: te.error
    }))
  };
}



export async function getRunnableTasks(executionId, now = new Date()) {
  if (!executionId) throw new Error("executionId is required");

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
    taskExecutionId: te.id,
    taskId: te.taskId,
    name: te.task.name,
    type: te.task.type,
    config: te.task.config,
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

export async function completeTask(taskExecutionId) {
  return prisma.taskExecution.update({
    where: { id: taskExecutionId },
    data: {
      state: TaskState.COMPLETED,
      completedAt: new Date()
    }
  });
}

export async function failTask(taskExecutionId, errorMessage, retryDelayMs = 10000) {
  return prisma.$transaction(async (tx) => {
    const te = await tx.taskExecution.findUnique({
      where: { id: taskExecutionId }
    });

    if (!te) throw new Error("Task execution not found");

    const nextRetryCount = te.retryCount + 1;

    if (nextRetryCount > te.maxRetries) {
      // Terminal failure
      return tx.taskExecution.update({
        where: { id: taskExecutionId },
        data: {
          state: TaskState.FAILED,
          completedAt: new Date(),
          retryCount: nextRetryCount,
          error: errorMessage
        }
      });
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

  if (states.some(s => s === TaskState.RUNNING || s === TaskState.RETRYING)) {
    newState = WorkflowState.RUNNING;
  } else if (states.some(s => s === TaskState.FAILED)) {
    newState = WorkflowState.FAILED;
  } else {
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
