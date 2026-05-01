import { SendEmailDefinition } from "./definitions/sendEmail.js";
import { IoEchoDefinition } from "./definitions/ioEcho.js";

export const taskRegistry = {
  SEND_EMAIL: SendEmailDefinition,
  IO_ECHO: IoEchoDefinition
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
