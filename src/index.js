import runWorkflow from "./engine/runWorkflow.js";

const workflow = {
    id: "ci_pipeline",
    tasks: [
      { id: "test", deps: [] },
      { id: "build", deps: ["test"] },
      { id: "deploy", deps: ["build"] }
    ]
  };

runWorkflow(workflow);