/**
 * Manual IO propagation checks (no test runner).
 *
 * Run: npm run test:io
 *
 * Requires DATABASE_URL and applied migrations (workflow_executions.input,
 * task_executions.output).
 */
import "dotenv/config";

import prisma from "../../prisma/client.js";
import { runWorkflowExecutor } from "../executor.js";
import runTask from "../modules/tasks/runTask.js";
import * as workflows from "../modules/workflows/workflows.service.js";

const POLL_MS = 25;

function byTaskName(execution) {
  const map = new Map();
  for (const t of execution.tasks) {
    map.set(t.name, t);
  }
  return map;
}

function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

async function runOnce(name, workflowPayload, workflowInput) {
  const wf = await workflows.createWorkflow({
    name: `io-test-${name}-${Date.now()}`,
    description: "manual IO propagation",
    tasks: workflowPayload.tasks
  });

  const executionId = await workflows.runWorkflow(wf.id, workflowInput, { skipQueue: true });
  await runWorkflowExecutor(executionId, runTask, POLL_MS);

  const final = await workflows.getWorkflowExecution(executionId);
  return { workflowId: wf.id, executionId, final };
}

async function scenarioFanIn() {
  const { final } = await runOnce(
    "fan-in",
    {
      tasks: [
        { name: "A", type: "IO_ECHO", dependencies: [], config: { emit: { fromA: 1 } } },
        { name: "B", type: "IO_ECHO", dependencies: [], config: { emit: { fromB: 2 } } },
        {
          name: "C",
          type: "IO_ECHO",
          dependencies: ["A", "B"],
          config: { emit: { fromC: 3 } }
        }
      ]
    },
    { trigger: "fan-in" }
  );

  assert(final.status === "COMPLETED", `fan-in: expected COMPLETED, got ${final.status}`);
  assert(
    final.input?.trigger === "fan-in",
    "fan-in: workflow input not stored on execution"
  );

  const m = byTaskName(final);
  const outC = m.get("C")?.output;
  assert(outC?.fromC === 3, "fan-in: C emit missing");
  const keys = outC._resolvedInputKeys ?? [];
  assert(
    keys.includes("trigger") && keys.includes("fromA") && keys.includes("fromB"),
    `fan-in: C should see workflow input + both upstream output keys; got ${JSON.stringify(keys)}`
  );
  console.log("✓ fan-in (two deps → one child): C resolved input includes trigger, fromA, fromB");
}

async function scenarioFanOut() {
  const { final } = await runOnce(
    "fan-out",
    {
      tasks: [
        { name: "Root", type: "IO_ECHO", dependencies: [], config: { emit: { seed: 42 } } },
        {
          name: "Left",
          type: "IO_ECHO",
          dependencies: ["Root"],
          config: { emit: { branch: "left" } }
        },
        {
          name: "Right",
          type: "IO_ECHO",
          dependencies: ["Root"],
          config: { emit: { branch: "right" } }
        }
      ]
    },
    { rootHint: "go" }
  );

  assert(final.status === "COMPLETED", `fan-out: expected COMPLETED, got ${final.status}`);
  const m = byTaskName(final);
  const left = m.get("Left")?.output;
  const right = m.get("Right")?.output;
  assert(left?.branch === "left", `fan-out Left: ${JSON.stringify(left)}`);
  assert(right?.branch === "right", `fan-out Right: ${JSON.stringify(right)}`);
  assert(
    left?._resolvedInputKeys?.includes("seed") && left?._resolvedInputKeys?.includes("rootHint"),
    `fan-out Left should see Root output key "seed" + workflow input; keys=${JSON.stringify(left?._resolvedInputKeys)}`
  );
  assert(
    right?._resolvedInputKeys?.includes("seed") && right?._resolvedInputKeys?.includes("rootHint"),
    `fan-out Right should see Root output key "seed" + workflow input; keys=${JSON.stringify(right?._resolvedInputKeys)}`
  );
  console.log("✓ fan-out (one parent → two children): both children see Root output key seed and workflow key rootHint");
}

async function scenarioShallowMergeCollision() {
  const { final } = await runOnce(
    "collision",
    {
      tasks: [
        { name: "A", type: "IO_ECHO", dependencies: [], config: { emit: { dup: "from-A" } } },
        { name: "B", type: "IO_ECHO", dependencies: [], config: { emit: { dup: "from-B" } } },
        {
          name: "Join",
          type: "IO_ECHO",
          dependencies: ["A", "B"],
          config: { emit: { join: true } }
        }
      ]
    },
    {}
  );

  assert(final.status === "COMPLETED", "collision: workflow not completed");
  const joinOut = byTaskName(final).get("Join")?.output;
  assert(joinOut?.join === true, "collision: join emit missing");
  const dup = joinOut?._mergedDup;
  assert(dup === "from-A" || dup === "from-B", `collision: dup should be one upstream value, got ${JSON.stringify(dup)}`);
  console.log(
    `✓ shallow merge collision: duplicate key "dup" on Join resolved to "${dup}" (last-wins shallow merge over dependency outputs; order follows dependency rows, not completion order)`
  );
}

async function main() {
  console.log("IO propagation manual test\n");
  await scenarioFanIn();
  await scenarioFanOut();
  await scenarioShallowMergeCollision();
  console.log("\nAll scenarios passed.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
