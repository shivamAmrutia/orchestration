import { SendEmailDefinition } from "./definitions/sendEmail.js";
import { IoEchoDefinition } from "./definitions/ioEcho.js";
import { HttpRequestDefinition } from "./definitions/httpRequest.js";
import { DelayDefinition } from "./definitions/delay.js";
import { TransformDefinition } from "./definitions/transform.js";
import { WebhookEmitDefinition } from "./definitions/webhookEmit.js";

export const taskRegistry = {
  SEND_EMAIL: SendEmailDefinition,
  IO_ECHO: IoEchoDefinition,
  HTTP_REQUEST: HttpRequestDefinition,
  DELAY: DelayDefinition,
  TRANSFORM: TransformDefinition,
  WEBHOOK_EMIT: WebhookEmitDefinition
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
