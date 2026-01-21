import runTask from "../tasks/runTask.js";

const TaskState = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  BLOCKED: "BLOCKED"
};

async function runWorkflow(workflow) {

  const taskState = new Map();
    
  for (const task of workflow.tasks) {
    taskState.set(task.id, TaskState.PENDING);
  }

  while (true) {
    let progress = false;

    for (const task of workflow.tasks) {
      if (taskState.get(task.id) !== TaskState.PENDING) continue;

      const deps = task.deps.map(d => taskState.get(d));

      if (deps.includes(TaskState.FAILED)) {
        taskState.set(task.id, TaskState.BLOCKED);
        console.log(`⛔ ${task.id} blocked`);
        progress = true;
        continue;
      }

      const ready = deps.every(s => s === TaskState.COMPLETED);
      if (!ready) continue;

      taskState.set(task.id, TaskState.RUNNING);
      try {
        await runTask(task.id);
        taskState.set(task.id, TaskState.COMPLETED);
        console.log(`✅ ${task.id} completed`);
      } catch (err) {
        taskState.set(task.id, TaskState.FAILED);
        console.log(`❌ ${task.id} failed`);
      }

      progress = true;
    }

    const done = [...taskState.values()].every(
      s => s !== TaskState.PENDING && s !== TaskState.RUNNING
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