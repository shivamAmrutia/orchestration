import { SendEmailDefinition } from "./definitions/sendEmail.js";

export const taskRegistry = {
  SEND_EMAIL: SendEmailDefinition
};

/**
 * Safe lookup helper
 */
export function getTaskDefinition(type) {
  const definition = taskRegistry[type];

  if (!definition) {
    throw new Error(`Unknown task type: ${type}`);
  }

  return definition;
}
