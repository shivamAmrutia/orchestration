import runWorkflow from "./engine/runWorkflow.js";
import { loadWorkflowForExecution } from "./db/workflow.js";
import "dotenv/config";


async function main() {
  try {
    // Load workflow from database
    let workflow;
    if (process.env.WORKFLOW_ID) {
      workflow = await loadWorkflowForExecution(process.env.WORKFLOW_ID);
    } else {
      console.error("❌ No workflow ID provided");
      process.exit(1);
    }

    console.log(`📋 Loaded workflow: ${workflow.name} (${workflow.id})`);
    console.log(`📦 Tasks: ${workflow.tasks.length}`);
    
    // Run the workflow
    await runWorkflow(workflow);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();