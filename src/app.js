import express from "express";
import cors from "cors";
import { workflowsModule } from "./modules/workflows/workflows.module.js";
import webhooksController from "./modules/webhooks/webhooks.controller.js";
import researchController from "./modules/research/research.controller.js";
import { apiKeyAuth } from "./middleware/apiKey.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(apiKeyAuth);

app.use("/api/workflows", workflowsModule());
app.use("/api/research", researchController);
app.use("/api/webhooks", webhooksController);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;
