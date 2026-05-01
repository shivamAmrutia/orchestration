// runTask.js

import { getTaskDefinition } from "../tasks/registry.js";
import { emailService } from "../services/email.service.js";

/**
 * Executes a task using task registry
 * @param {Object} task
 */
export default async function runTask(task) {
  const definition = getTaskDefinition(task.type);

  if (!definition) {
    throw new Error(`Unknown task type: ${task.type}`);
  }

  console.log(`🔧 Executing task type: ${task.type}`);

  const workflowInput = task.workflowInput ?? {};
  const upstreamOutputs = task.upstreamOutputs ?? {};
  const mergedUpstreamOutput = Object.values(upstreamOutputs).reduce((acc, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return { ...acc, ...value };
    }
    return acc;
  }, {});

  const input = {
    ...workflowInput,
    ...mergedUpstreamOutput,
    ...(task.config ?? {})
  };

  return definition.run({
    config: task.config,
    input,
    executionId: task.workflowExecutionId,
    taskExecutionId: task.taskExecutionId,
    workflowInput,
    upstreamOutputs,
    services: {
      email: emailService
    }
  });
}
