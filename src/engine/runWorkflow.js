import runTask from "../tasks/runTask.js";

async function runWorkflow(workflow) {
    const completed = new Set();
  
    while (completed.size < workflow.tasks.length) {
      let progress = false;
  
      for (const task of workflow.tasks) {
        if (completed.has(task.id)) continue;
  
        const ready = task.deps.every(dep => completed.has(dep));
        if (ready) {
          await runTask(task.id);
          completed.add(task.id);
          progress = true;
        }
      }
  
      if (!progress) {
        throw new Error("Circular dependency detected");
      }
    }
  
    console.log("🎉 Workflow completed");
  }

export default runWorkflow;