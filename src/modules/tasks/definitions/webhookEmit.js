import { z } from "zod";

const inputSchema = z.object({
  url: z.string().url(),
  payload: z.record(z.string(), z.unknown()).optional()
});

export const WebhookEmitDefinition = {
  type: "WEBHOOK_EMIT",
  description: "POST a JSON payload to an external webhook URL",
  category: "INTEGRATION",
  inputSchema,
  sideEffects: true,

  async run({ input, config }) {
    const parsed = inputSchema.parse({
      url: config?.url ?? input?.url,
      payload: config?.payload ?? input?.payload ?? input
    });

    const response = await fetch(parsed.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.payload ?? {})
    });

    const text = await response.text();
    let body = text;
    try {
      body = JSON.parse(text);
    } catch {
      // keep text
    }

    if (!response.ok) {
      throw new Error(`Webhook emit failed: ${response.status} ${text}`);
    }

    return {
      status: response.status,
      delivered: true,
      response: body
    };
  }
};
