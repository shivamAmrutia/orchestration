/**
 * Maps current engine task types to InsightFlow research pipeline roles.
 *
 * Interim primitives (M0–M2) reuse existing registry entries.
 * Research-native task types (M2+) will replace these incrementally.
 */

/** @typedef {'source_discovery' | 'collection' | 'extraction' | 'validation' | 'graph' | 'change' | 'report' | 'internal'} ResearchRole */

/** @type {Record<string, { role: ResearchRole, status: 'interim' | 'planned' | 'native', replacedBy?: string, description: string }>} */
export const taskTypeMapping = {
  HTTP_REQUEST: {
    role: "collection",
    status: "interim",
    replacedBy: "COLLECT_NEWS | COLLECT_WEB | COLLECT_REDDIT | COLLECT_BLOGS",
    description: "Generic HTTP fetch; used for source collection until connector tasks exist"
  },
  TRANSFORM: {
    role: "extraction",
    status: "interim",
    replacedBy: "EXTRACT_CLAIMS",
    description: "JSON shaping; stand-in before LLM claim extraction"
  },
  WEBHOOK_EMIT: {
    role: "report",
    status: "interim",
    replacedBy: "GENERATE_REPORT",
    description: "Outbound notify; stand-in before intelligence brief task"
  },
  DELAY: {
    role: "internal",
    status: "interim",
    description: "Scheduling delays between steps if needed"
  },
  SEND_EMAIL: {
    role: "report",
    status: "interim",
    description: "Alert delivery channel for intelligence briefs"
  },
  IO_ECHO: {
    role: "internal",
    status: "interim",
    description: "Engine regression / IO propagation tests only; not used in product DAGs"
  },

  SOURCE_DISCOVERY: {
    role: "source_discovery",
    status: "planned",
    description: "Given research goal, produce seed URLs, feeds, and search queries"
  },
  COLLECT_NEWS: {
    role: "collection",
    status: "planned",
    description: "Collect articles from news APIs/RSS"
  },
  COLLECT_WEB: {
    role: "collection",
    status: "planned",
    description: "Fetch and extract company website pages"
  },
  COLLECT_BLOGS: {
    role: "collection",
    status: "planned",
    description: "Collect blog posts from discovered RSS feeds"
  },
  COLLECT_REDDIT: {
    role: "collection",
    status: "planned",
    description: "Collect Reddit posts/comments matching goal keywords"
  },
  EXTRACT_CLAIMS: {
    role: "extraction",
    status: "planned",
    description: "LLM extraction of entities, claims, and events from documents"
  },
  VALIDATE_EVIDENCE: {
    role: "validation",
    status: "planned",
    description: "Cross-source corroboration and confidence scoring"
  },
  UPDATE_GRAPH: {
    role: "graph",
    status: "planned",
    description: "Upsert entities, claims, and evidence into knowledge graph"
  },
  DETECT_CHANGES: {
    role: "change",
    status: "planned",
    description: "Diff graph against previous run; emit change events"
  },
  GENERATE_REPORT: {
    role: "report",
    status: "planned",
    description: "Synthesize intelligence brief from graph delta and top claims"
  }
};

export function getInterimTasks() {
  return Object.entries(taskTypeMapping)
    .filter(([, m]) => m.status === "interim")
    .map(([type, m]) => ({ type, ...m }));
}

export function getPlannedResearchTasks() {
  return Object.entries(taskTypeMapping)
    .filter(([, m]) => m.status === "planned")
    .map(([type, m]) => ({ type, ...m }));
}
