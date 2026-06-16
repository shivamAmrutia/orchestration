/**
 * Portfolio demo workflow templates consumed by the engine API and playground UI.
 */
export const portfolioTemplates = [
  {
    slug: "content-pipeline",
    name: "Content Pipeline",
    description: "Fetch JSON from a URL, transform fields, then emit to a webhook.",
    dagShape: "linear",
    defaultInput: {
      url: "https://jsonplaceholder.typicode.com/posts/1",
      webhookUrl: "https://webhook.site/unique-id"
    },
    workflow: {
      name: "portfolio-content-pipeline",
      description: "Fetch → transform → webhook notify",
      tasks: [
        {
          name: "fetch",
          type: "HTTP_REQUEST",
          dependencies: [],
          config: {}
        },
        {
          name: "shape",
          type: "TRANSFORM",
          dependencies: ["fetch"],
          config: {
            pick: ["data"],
            emit: { pipeline: "content" }
          }
        },
        {
          name: "notify",
          type: "WEBHOOK_EMIT",
          dependencies: ["shape"],
          config: {}
        }
      ]
    },
    inputHints: [
      { key: "url", label: "Fetch URL", type: "url", required: true },
      { key: "webhookUrl", label: "Webhook URL", type: "url", required: true }
    ],
    resolveRunInput: (form) => ({
      url: form.url,
      webhookUrl: form.webhookUrl
    }),
    resolveTaskOverrides: (form) => ({
      fetch: { url: form.url },
      notify: { url: form.webhookUrl, payload: { source: "content-pipeline" } }
    })
  },
  {
    slug: "fan-out-merge",
    name: "Fan-out Merge Report",
    description: "Fetch three sources in parallel, merge outputs, and summarize.",
    dagShape: "fan-out",
    defaultInput: {
      sourceA: "https://jsonplaceholder.typicode.com/posts/1",
      sourceB: "https://jsonplaceholder.typicode.com/posts/2",
      sourceC: "https://jsonplaceholder.typicode.com/posts/3"
    },
    workflow: {
      name: "portfolio-fan-out-merge",
      description: "Parallel fetch → merge transform",
      tasks: [
        { name: "sourceA", type: "HTTP_REQUEST", dependencies: [], config: {} },
        { name: "sourceB", type: "HTTP_REQUEST", dependencies: [], config: {} },
        { name: "sourceC", type: "HTTP_REQUEST", dependencies: [], config: {} },
        {
          name: "merge",
          type: "TRANSFORM",
          dependencies: ["sourceA", "sourceB", "sourceC"],
          config: { emit: { report: "fan-out-merge" } }
        }
      ]
    },
    inputHints: [
      { key: "sourceA", label: "Source A URL", type: "url", required: true },
      { key: "sourceB", label: "Source B URL", type: "url", required: true },
      { key: "sourceC", label: "Source C URL", type: "url", required: true }
    ],
    resolveRunInput: (form) => ({
      sourceA: form.sourceA,
      sourceB: form.sourceB,
      sourceC: form.sourceC
    }),
    resolveTaskOverrides: (form) => ({
      sourceA: { url: form.sourceA },
      sourceB: { url: form.sourceB },
      sourceC: { url: form.sourceC }
    })
  },
  {
    slug: "failure-blocked",
    name: "Failure & Blocked Demo",
    description: "One task fails intentionally; downstream tasks are marked BLOCKED.",
    dagShape: "failure",
    defaultInput: {
      failMessage: "Simulated upstream failure"
    },
    workflow: {
      name: "portfolio-failure-blocked",
      description: "Fail task → blocked downstream",
      tasks: [
        {
          name: "willFail",
          type: "TRANSFORM",
          dependencies: [],
          config: { fail: true, maxRetries: 1 }
        },
        {
          name: "downstream",
          type: "IO_ECHO",
          dependencies: ["willFail"],
          config: { emit: { shouldNotRun: true } }
        }
      ]
    },
    inputHints: [
      { key: "failMessage", label: "Failure message", type: "text", required: false }
    ],
    resolveRunInput: (form) => ({
      failMessage: form.failMessage || "Simulated upstream failure"
    }),
    resolveTaskOverrides: (form) => ({
      willFail: { fail: true, failMessage: form.failMessage, maxRetries: 1 }
    })
  }
];

export function getTemplateBySlug(slug) {
  return portfolioTemplates.find((t) => t.slug === slug) ?? null;
}

export function buildWorkflowPayload(template, formValues = {}) {
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
