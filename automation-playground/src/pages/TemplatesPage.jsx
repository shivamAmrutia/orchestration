import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchTemplates,
  createWorkflow,
  runWorkflow,
  buildWorkflowFromTemplate,
  buildRunInput
} from "../api/engine.js";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTemplates()
      .then((data) => {
        setTemplates(data);
        if (data[0]) selectTemplate(data[0]);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function selectTemplate(template) {
    setSelected(template);
    setForm({ ...(template.defaultInput ?? {}) });
    setError(null);
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRun() {
    if (!selected) return;
    setRunning(true);
    setError(null);

    try {
      const workflowPayload = buildWorkflowFromTemplate(selected, form);
      const workflow = await createWorkflow(workflowPayload);
      const runInput = buildRunInput(selected, form);
      const { executionId } = await runWorkflow(workflow.id, runInput);
      navigate(`/runs/${executionId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  if (loading) return <p className="muted">Loading templates…</p>;

  return (
    <div className="layout-split">
      <aside className="sidebar">
        <h2>Templates</h2>
        <ul className="template-list">
          {templates.map((t) => (
            <li key={t.slug}>
              <button
                type="button"
                className={selected?.slug === t.slug ? "active" : ""}
                onClick={() => selectTemplate(t)}
              >
                <strong>{t.name}</strong>
                <span>{t.dagShape}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="panel">
        {selected ? (
          <>
            <h1>{selected.name}</h1>
            <p className="muted">{selected.description}</p>

            <form
              className="run-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleRun();
              }}
            >
              {(selected.inputHints ?? []).map((hint) => (
                <label key={hint.key} className="field">
                  <span>{hint.label}</span>
                  <input
                    type={hint.type === "url" ? "url" : "text"}
                    value={form[hint.key] ?? ""}
                    required={hint.required}
                    onChange={(e) => updateField(hint.key, e.target.value)}
                  />
                </label>
              ))}

              {error && <p className="error">{error}</p>}

              <button type="submit" disabled={running}>
                {running ? "Queuing…" : "Run workflow"}
              </button>
            </form>
          </>
        ) : (
          <p>Select a template to configure and run.</p>
        )}
      </section>
    </div>
  );
}
