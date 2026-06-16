import { z } from "zod";

const inputSchema = z.object({
  ms: z.number().int().positive().max(300000)
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const DelayDefinition = {
  type: "DELAY",
  description: "Wait for a specified duration before continuing",
  category: "UTILITY",
  inputSchema,
  sideEffects: false,

  async run({ input, config }) {
    const parsed = inputSchema.parse({
      ms: config?.ms ?? input?.ms
    });

    await sleep(parsed.ms);

    return {
      delayedMs: parsed.ms,
      completedAt: new Date().toISOString()
    };
  }
};
