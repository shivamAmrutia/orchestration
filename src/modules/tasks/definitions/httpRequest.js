import { z } from "zod";

const inputSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
  timeoutMs: z.number().int().positive().optional()
});

export const HttpRequestDefinition = {
  type: "HTTP_REQUEST",
  description: "Perform an HTTP request and return status, headers, and body",
  category: "INTEGRATION",
  inputSchema,
  sideEffects: true,

  async run({ input, config }) {
    const parsed = inputSchema.parse({ ...config, ...input });
    const method = parsed.method ?? "GET";
    const timeoutMs = parsed.timeoutMs ?? 15000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const init = {
        method,
        headers: parsed.headers ?? {},
        signal: controller.signal
      };

      if (parsed.body !== undefined && method !== "GET") {
        init.headers["Content-Type"] ??= "application/json";
        init.body =
          typeof parsed.body === "string" ? parsed.body : JSON.stringify(parsed.body);
      }

      const response = await fetch(parsed.url, init);
      const contentType = response.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
      }

      return {
        status: response.status,
        ok: response.ok,
        data
      };
    } finally {
      clearTimeout(timer);
    }
  }
};
