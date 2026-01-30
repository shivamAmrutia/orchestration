import { Router } from "express";
import * as service from "./workflows.service.js";

const router = Router();

router.get("/test", async(req,res) => {
    console.log("works well");
});

router.post("/", async (req, res, next) => {
  try {
    const workflow = await service.createWorkflow(req.body);
    res.status(201).json(workflow);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const workflow = await service.getWorkflow(req.params.id);
    res.json(workflow);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/run", async (req, res, next) => {
  try {
    const execution = await service.runWorkflow(req.params.id);
    res.status(202).json(execution);
  } catch (err) {
    next(err);
  }
});

export default router;
