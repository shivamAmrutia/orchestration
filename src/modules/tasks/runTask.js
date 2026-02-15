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

  return definition.run({
    config: task.config,
    executionId: task.workflowExecutionId,
    taskExecutionId: task.taskExecutionId,
    services: {
      email: emailService
    }
  });
}
