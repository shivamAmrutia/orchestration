import { z } from "zod";

const inputSchema = z.record(z.string(), z.unknown());

export const TransformDefinition = {
  type: "TRANSFORM",
  description: "Pick, rename, or reshape JSON fields from resolved input",
  category: "UTILITY",
  inputSchema,
  sideEffects: false,

  async run({ input, config }) {
    const safeInput = inputSchema.parse(input ?? {});

    if (config?.fail) {
      throw new Error(config.failMessage ?? "Intentional failure for demo");
    }

    const pick = Array.isArray(config?.pick) ? config.pick : null;
    const rename = config?.rename && typeof config.rename === "object" ? config.rename : {};
    const emit = config?.emit && typeof config.emit === "object" ? config.emit : {};

    let working = { ...safeInput };

    if (pick) {
      working = pick.reduce((acc, key) => {
        if (Object.prototype.hasOwnProperty.call(safeInput, key)) {
          acc[key] = safeInput[key];
        }
        return acc;
      }, {});
    }

    const renamed = {};
    for (const [key, value] of Object.entries(working)) {
      renamed[rename[key] ?? key] = value;
    }

    return {
      ...emit,
      ...renamed,
      _transformedKeys: Object.keys(renamed).sort()
    };
  }
};
