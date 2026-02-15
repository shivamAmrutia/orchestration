import { z } from "zod";

/**
 * Input validation schema
 */
const sendEmailInputSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1)
});

export const SendEmailDefinition = {
  type: "SEND_EMAIL",

  description: "Send an email to a recipient",

  category: "COMMUNICATION",

  inputSchema: sendEmailInputSchema,

  sideEffects: true,

  /**
   * @param {import("../types.js").TaskContext} context
   */
  async run({ config, services }) {
    //Validate input
    const parsed = sendEmailInputSchema.parse(config);

    if (!services.email) {
      throw new Error("Email service not available");
    }

    //Execute real-world side effect
    await services.email.send({
      to: parsed.to,
      subject: parsed.subject,
      body: parsed.body
    });

    return {
      status: "EMAIL_SENT",
      to: parsed.to
    };
  }
};
    