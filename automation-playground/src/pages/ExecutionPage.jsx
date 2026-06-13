import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getExecution } from "../api/engine.js";

const TERMINAL = new Set(["COMPLETED", "FAILED"]);

const stateClass = {
  PENDING: "state-pending",
  RUNNING: "state-running",
  RETRYING: "state-retrying",
  COMPLETED: "state-completed",
  FAILED: "state-failed",
  BLOCKED: "state-blocked"
};

export default function ExecutionPage() {
  const { executionId } = useParams();
  const [execution, setExecution] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const data = await getExecution(executionId);
        if (!active) return;
        setExecution(data);
        setError(null);
        if (!TERMINAL.has(data.status)) {
          setTimeout(poll, 1000);
        }
      } catch (err) {
        if (active) setError(err.message);
      }
    }

    poll();
    return () => {
      active = false;
    };
  }, [executionId]);

  if (error) {
    return (
      <div className="panel">
        <p className="error">{error}</p>
        <Link to="/">Back to templates</Link>
      </div>
    );
  }

  if (!execution) {
    return <p className="muted">Loading execution…</p>;
  }

  return (
    <div className="panel execution-panel">
      <div className="execution-header">
        <div>
          <h1>Execution</h1>
          <p className="mono">{execution.id}</p>
        </div>
        <span className={`badge ${stateClass[execution.status] ?? ""}`}>
          {execution.status}
        </span>
      </div>

      <p className="muted">
        Workflow: {execution.workflowName ?? execution.workflowId}
      </p>

      <section className="timeline">
        <h2>Task timeline</h2>
        <ul>
          {execution.tasks.map((task) => (
            <li key={task.id} className="timeline-item">
              <div className="timeline-head">
                <strong>{task.name}</strong>
                <span className="mono">{task.type}</span>
                <span className={`badge ${stateClass[task.state] ?? ""}`}>
                  {task.state}
                </span>
              </div>
              {task.error && <p className="error">{task.error}</p>}
              {task.output && (
                <pre className="io-block">{JSON.stringify(task.output, null, 2)}</pre>
              )}
            </li>
          ))}
        </ul>
      </section>

      {execution.input && (
        <section>
          <h2>Workflow input</h2>
          <pre className="io-block">{JSON.stringify(execution.input, null, 2)}</pre>
        </section>
      )}

      <Link to="/" className="back-link">
        Run another template
      </Link>
    </div>
  );
}
