import {
    getRunnableTasks,
    markTaskRunning,
    completeTask,
    failTask,
    updateWorkflowExecutionStatus,
    getWorkflowExecution
} from "./modules/workflows/service.js";

/**
 * Run the executor for one workflow execution
 * @param {string} workflowExecutionId
 * @param {Function} runTaskFn - async function to actually run a task
 * @param {number} pollIntervalMs - how often to check for runnable tasks
 */
export async function runWorkflowExecutor(
    workflowExecutionId,
    runTaskFn,
    pollIntervalMs = 1000
) {
    console.log(`🚀 Executor started for workflow execution: ${workflowExecutionId}`);

    let active = true;

    while (active) {
        // 1️⃣ Get runnable tasks
        const tasks = await getRunnableTasks(workflowExecutionId);

        if (!tasks.length) {
            // No tasks ready, sleep a bit
            await sleep(pollIntervalMs);
            continue;
        }

        // 2️⃣ Execute tasks in parallel
        await Promise.all(
            tasks.map(async (task) => {
                try {
                    // Claim task
                    await markTaskRunning(task.taskExecutionId);
                    console.log(`🏃 Running task: ${task.name} (${task.taskId})`);

                    // Execute user-provided function
                    await runTaskFn(task);

                    // Mark task completed
                    await completeTask(task.taskExecutionId);
                    console.log(`✅ Task completed: ${task.name} (${task.taskId})`);
                } catch (err) {
                    // Fail task or schedule retry
                    await failTask(task.taskExecutionId, err.message);
                    console.log(`❌ Task failed: ${task.name} (${task.taskId}) | ${err.message}`);
                } finally {
                    // Update workflow execution status
                    await updateWorkflowExecutionStatus(workflowExecutionId);
                }
            })
        );

        // 3️⃣ Check if workflow is terminal
        const workflowExecution = await getWorkflowExecution(workflowExecutionId);
        if (["COMPLETED", "FAILED"].includes(workflowExecution.status)) {
            console.log(`🎯 Workflow ${workflowExecutionId} finished with status: ${workflowExecution.status}`);
            active = false;
        }

        // Avoid tight loop
        await sleep(pollIntervalMs);
    }
}

// Helper sleep
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
