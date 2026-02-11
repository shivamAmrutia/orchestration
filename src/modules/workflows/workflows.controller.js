import { Router } from "express";
import * as service from "./workflows.service.js";
import { runWorkflowExecutor } from "../../executor.js";
import runTask  from "../tasks/runTask.js"

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const workflow = await service.createWorkflow(req.body);
    res.status(201).json(workflow);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const workflow = await service.getWorkflow(req.params.id);
    res.json(workflow);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Manual trigger
router.post("/:id/run", async (req, res) => {
  const workflowId = req.params.id;

  try {
    // 1. Validate workflow
    const workflow = await service.getWorkflow(workflowId);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    // 2. Create execution
    const execution = await service.runWorkflow(workflowId);

    // 3. Manually trigger executor (fire-and-forget)
    runWorkflowExecutor(execution.id, runTask)
      .catch(err => {
        console.error("Executor crashed:", err);
      });

    // 4. Respond immediately
    res.status(202).json({
      message: "Workflow triggered",
      executionId: execution.id
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
