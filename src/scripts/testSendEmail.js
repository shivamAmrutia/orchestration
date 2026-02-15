import { runTask } from "../modules/tasks/runTask.js";

async function test() {
  const fakeTask = {
    type: "SEND_EMAIL",
    config: {
      to: "sa8572@nyu.edu",
      subject: "Test from Workflow Engine",
      body: "If you received this, your task system works."
    },
    workflowExecutionId: "test-workflow",
    taskExecutionId: "test-task-1"
  };

  try {
    await runTask(fakeTask);
    console.log("✅ Task executed successfully");
  } catch (err) {
    console.error("❌ Task failed:", err);
  }
}

test();
