import { Router } from "express";
import * as service from "../workflows/workflows.service.js";

const router = Router();

/**
 * Event ingress: external systems POST payloads to trigger a workflow run.
 * Body: { callbackUrl?, ...payload } — remaining fields become workflow input.
 */
router.post("/:workflowId", async (req, res) => {
  try {
    const workflowId = req.params.workflowId;
    const workflow = await service.getWorkflow(workflowId);

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    const body = req.body ?? {};
    const { callbackUrl, ...input } = body;

    const executionId = await service.runWorkflow(workflowId, input, { callbackUrl });

    res.status(202).json({
      message: "Workflow triggered via webhook",
      executionId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
