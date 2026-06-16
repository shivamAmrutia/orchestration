import "dotenv/config";

import { runWorkflowExecutor } from "./executor.js";
import runTask from "./modules/tasks/runTask.js";
import {
  claimNextJob,
  completeJob,
  failJob
} from "./queue/executionQueue.js";
import { getWorkflowExecution, finalizeWorkflowExecution } from "./modules/workflows/workflows.service.js";
import { notifyExecutionComplete } from "./services/callback.service.js";

const POLL_MS = Number(process.env.WORKER_POLL_MS) || 1000;
const EXECUTOR_POLL_MS = Number(process.env.EXECUTOR_POLL_MS) || 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processJob(job) {
  console.log(`Worker processing execution ${job.workflowExecutionId}`);

  await runWorkflowExecutor(job.workflowExecutionId, runTask, EXECUTOR_POLL_MS);

  const execution = await getWorkflowExecution(job.workflowExecutionId);
  await finalizeWorkflowExecution(job.workflowExecutionId, execution.status);
  await notifyExecutionComplete(execution);

  await completeJob(job.id);
  console.log(`Worker finished execution ${job.workflowExecutionId} (${execution.status})`);
}

function isDatabaseUnavailable(err) {
  return err?.code === "P1001" || err?.name === "DriverAdapterError";
}

async function runWorker() {
  console.log("Worker started");

  while (true) {
    try {
      const job = await claimNextJob();

      if (!job) {
        await sleep(POLL_MS);
        continue;
      }

      try {
        await processJob(job);
      } catch (err) {
        console.error(`Worker failed on job ${job.id}:`, err);
        await failJob(job.id, err.message);
      }
    } catch (err) {
      if (isDatabaseUnavailable(err)) {
        console.error("Database unavailable — retrying…");
        await sleep(POLL_MS);
        continue;
      }
      throw err;
    }
  }
}

runWorker().catch((err) => {
  console.error("Worker crashed:", err);
  process.exit(1);
});
