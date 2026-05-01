import { z } from "zod";

const inputSchema = z.record(z.string(), z.unknown());

/**
 * Returns structured output for tests. `config.emit` (object) is spread into the
 * task output so downstream tasks can receive stable, distinct keys.
 */
export const IoEchoDefinition = {
  type: "IO_ECHO",

  description: "Echo resolved input keys and optional emit payload (for IO tests)",

  category: "DEBUG",

  inputSchema,

  sideEffects: false,

  /**
   * @param {import("../types.js").TaskContext} context
   */
  async run({ input, config }) {
    const safeInput = inputSchema.parse(input ?? {});
    const emit =
      config?.emit && typeof config.emit === "object" && !Array.isArray(config.emit)
        ? config.emit
        : {};

    return {
      ...emit,
      _resolvedInputKeys: Object.keys(safeInput).sort(),
      ...(Object.prototype.hasOwnProperty.call(safeInput, "dup")
        ? { _mergedDup: safeInput.dup }
        : {})
    };
  }
};
