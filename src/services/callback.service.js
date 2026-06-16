/**
 * POST execution result to optional callback URL when a workflow run finishes.
 */
export async function notifyExecutionComplete(execution) {
  const callbackUrl = execution.callbackUrl;
  if (!callbackUrl) return;

  try {
    const response = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        executionId: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        input: execution.input,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        tasks: execution.tasks
      })
    });

    if (!response.ok) {
      console.error(
        `Callback to ${callbackUrl} failed: ${response.status} ${response.statusText}`
      );
    }
  } catch (err) {
    console.error(`Callback to ${callbackUrl} failed:`, err.message);
  }
}
