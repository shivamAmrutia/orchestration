import express from "express";
import cors from "cors";
import { workflowsModule } from "./modules/workflows/workflows.module.js"

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.use("/api", workflowsModule());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;
