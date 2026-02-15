// services/email.service.js

import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const emailService = {
  async send({ to, subject, body }) {
    console.log("📧 Sending email...");

    const info = await transporter.sendMail({
      from: `"Workflow Engine" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: body
    });

    console.log("📨 Email sent:", info.messageId);
    return info;
  }
};
