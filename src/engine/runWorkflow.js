import runTask from "../modules/tasks/runTask.js";

const TaskState = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  BLOCKED: "BLOCKED",
  RETRYING: "RETRYING"
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 10000;

async function runWorkflow(workflow) {

  const taskState = new Map();
  const taskRetries = new Map();
  const retrySchedules = new Map(); // Maps taskId -> timestamp when retry should happen
    
  for (const task of workflow.tasks) {
    taskState.set(task.id, TaskState.PENDING);
    taskRetries.set(task.id, 0);
  }

  while (true) {
    let progress = false;
    const now = Date.now();

    // Check if any retrying tasks are ready to be retried
    for (const [taskId, retryTime] of retrySchedules.entries()) {
      if (now >= retryTime && taskState.get(taskId) === TaskState.RETRYING) {
        taskState.set(taskId, TaskState.PENDING);
        retrySchedules.delete(taskId);
      }
      progress = true;
    }

    for (const task of workflow.tasks) {
      if (taskState.get(task.id) !== TaskState.PENDING) continue;

      const deps = task.deps.map(d => taskState.get(d));

      if (deps.includes(TaskState.FAILED)) {
        taskState.set(task.id, TaskState.BLOCKED);
        console.log(`⛔ ${task.name} blocked`);
        progress = true;
        continue;
      }

      const ready = deps.every(s => s === TaskState.COMPLETED);
      if (!ready) continue;

      taskState.set(task.id, TaskState.RUNNING);
      try {
        await runTask(task.name);
        taskState.set(task.id, TaskState.COMPLETED);
        console.log(`✅ ${task.name} completed`);
      } catch (err) {
        taskRetries.set(task.id, taskRetries.get(task.id) + 1);
        if (taskRetries.get(task.id) < MAX_RETRIES) {
          // Schedule retry without blocking - set state to RETRYING and track retry time
          taskState.set(task.id, TaskState.RETRYING);
          retrySchedules.set(task.id, now + RETRY_DELAY);
          console.log(`⏳ ${task.name} scheduled for retry ${taskRetries.get(task.id)}/${MAX_RETRIES} in ${RETRY_DELAY}ms`);
        } else {
          taskState.set(task.id, TaskState.FAILED);
          console.log(`❌ ${task.name} failed after ${MAX_RETRIES} retries`);
        }
      }

      progress = true;
    }

    const done = [...taskState.values()].every(
      s => s !== TaskState.PENDING && s !== TaskState.RUNNING && s !== TaskState.RETRYING
    );

    if (done) break;

    if (!progress) {
      throw new Error("Deadlock detected");
    }
  }

  console.log("🎯 Final task states:");
  console.table(Object.fromEntries(taskState));
}

export default runWorkflow;