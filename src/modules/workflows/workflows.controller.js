import { Router } from "express";
import * as service from "./workflows.service.js";
import { runWorkflowExecutor } from "../../executor.js";
import runTask  from "../tasks/runTask.js"

const router = Router();

//create workflow
router.post("/", async (req, res, next) => {
  try {
    const workflow = await service.createWorkflow(req.body);
    res.status(201).json(workflow);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

//get all workflows
router.get("/", async (req, res, next) => {
  try{
    const workflows = await service.listWorkflows()
    res.json(workflows)
  } catch(err){
    console.error(err);
    res.status(500).json({error: err.message})
  }
});

// get a single execution (must be registered before /:id)
router.get("/executions/:executionId", async (req, res, next) => {
  try {
    const execution = await service.getWorkflowExecution(req.params.executionId);
    res.json(execution);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// get all executions for a workflow
router.get("/:id/executions", async (req, res, next) => {
  try {
    const executions = await service.getAllExecutionsForWorkflow(req.params.id);
    res.json(executions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Manual trigger
router.post("/:id/run", async (req, res, next) => {
  const workflowId = req.params.id;

  try {
    // 1. Validate workflow
    const workflow = await service.getWorkflow(workflowId);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    // 2. Create execution
    const executionId = await service.runWorkflow(workflowId, req.body ?? null);

    // 3. Manually trigger executor (fire-and-forget)
    runWorkflowExecutor(executionId, runTask)
      .catch(err => {
        console.error("Executor crashed:", err);
      });

    // 4. Respond immediately
    res.status(202).json({
      message: "Workflow triggered",
      executionId: executionId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// get workflow details
router.get("/:id", async (req, res, next) => {
  try {
    const workflow = await service.getWorkflow(req.params.id);
    res.json(workflow);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
