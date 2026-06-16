import { Router } from "express";
import { researchRecipes } from "../../templates/researchRecipes.js";
import { taskTypeMapping, getInterimTasks, getPlannedResearchTasks } from "../../domain/taskMapping.js";

const router = Router();

/** Canonical research DAG recipes (M2 will wire to workspace provisioning) */
router.get("/recipes", (_req, res) => {
  res.json(researchRecipes);
});

/** Task type roadmap: interim engine tasks vs planned research-native tasks */
router.get("/task-mapping", (_req, res) => {
  res.json({
    interim: getInterimTasks(),
    planned: getPlannedResearchTasks(),
    full: taskTypeMapping
  });
});

export default router;
