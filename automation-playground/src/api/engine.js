const BASE = import.meta.env.VITE_ENGINE_URL || "";

function headers() {
  const h = { "Content-Type": "application/json" };
  const key = import.meta.env.VITE_API_KEY;
  if (key) h["X-API-Key"] = key;
  return h;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers(), ...options.headers }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || res.statusText);
  }
  return data;
}

export function fetchTemplates() {
  return request("/api/workflows/templates/catalog");
}

export function createWorkflow(payload) {
  return request("/api/workflows", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function runWorkflow(workflowId, body) {
  return request(`/api/workflows/${workflowId}/run`, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function getExecution(executionId) {
  return request(`/api/workflows/executions/${executionId}`);
}

export function buildWorkflowFromTemplate(template, formValues) {
  const defaults = template.defaultInput ?? {};
  const merged = { ...defaults, ...formValues };
  const overrides = template.resolveTaskOverrides?.(merged) ?? {};

  return {
    name: `${template.workflow.name}-${Date.now()}`,
    description: template.workflow.description,
    tasks: template.workflow.tasks.map((task) => ({
      ...task,
      config: {
        ...(task.config ?? {}),
        ...(overrides[task.name] ?? {})
      }
    }))
  };
}

export function buildRunInput(template, formValues) {
  const defaults = template.defaultInput ?? {};
  const merged = { ...defaults, ...formValues };
  return template.resolveRunInput?.(merged) ?? merged;
}
