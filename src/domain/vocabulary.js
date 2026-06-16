/**
 * InsightFlow domain vocabulary.
 *
 * Maps product language to engine primitives. Use these terms in API docs,
 * UI copy, and new modules — not "workflow" in user-facing surfaces unless
 * referring to the DAG inspector.
 */

/** @typedef {'company' | 'market' | 'technology'} EntityType */

/** @typedef {'active' | 'paused' | 'error'} WorkspaceStatus */

/**
 * A persistent monitoring environment tied to one research goal.
 * Maps to: Workflows (engine) + future ResearchWorkspace table (M1).
 * @typedef {Object} Workspace
 * @property {string} id
 * @property {string} name
 * @property {string} goal - e.g. "Monitor the AI coding assistant market"
 * @property {EntityType} entityType
 * @property {WorkspaceStatus} status
 * @property {string} [workflowId] - backing DAG definition
 */

/**
 * The user's intent — what to monitor and why.
 * Stored on workspace; passed as WorkflowExecution.input on each run.
 * @typedef {Object} ResearchGoal
 * @property {string} text
 * @property {EntityType} entityType
 * @property {string[]} [seedUrls]
 * @property {string[]} [keywords]
 */

/**
 * A single execution of a research DAG.
 * Maps to: WorkflowExecution (engine).
 * @typedef {Object} Run
 * @property {string} id
 * @property {string} workspaceId
 * @property {string} workflowId
 * @property {'RUNNING' | 'COMPLETED' | 'FAILED'} status
 * @property {ResearchGoal} input
 * @property {Date} startedAt
 * @property {Date} [completedAt]
 */

/**
 * A synthesized insight surfaced to the user (brief section, alert, graph node).
 * Produced by L5 Intelligence Engine (M7+).
 * @typedef {Object} Finding
 * @property {string} id
 * @property {string} summary
 * @property {string} claimId
 * @property {number} confidence
 */

/**
 * A structured assertion extracted from sources.
 * @typedef {Object} Claim
 * @property {string} id
 * @property {string} entityId
 * @property {string} claimType - PRODUCT_LAUNCH, FUNDING, etc.
 * @property {string} text
 * @property {number} confidence
 */

/**
 * An origin document or feed entry.
 * Maps to: CollectedDocument (M3).
 * @typedef {Object} Source
 * @property {string} id
 * @property {string} url
 * @property {'news' | 'web' | 'blog' | 'reddit' | 'other'} sourceType
 * @property {Date} fetchedAt
 */

/**
 * Links a claim to a source document with provenance.
 * @typedef {Object} Evidence
 * @property {string} id
 * @property {string} claimId
 * @property {string} sourceId
 * @property {string} runId - WorkflowExecution id for audit trail
 * @property {number} confidence
 */

export const EntityType = Object.freeze({
  COMPANY: "company",
  MARKET: "market",
  TECHNOLOGY: "technology"
});

export const WorkspaceStatus = Object.freeze({
  ACTIVE: "active",
  PAUSED: "paused",
  ERROR: "error"
});

export const ClaimType = Object.freeze({
  PRODUCT_LAUNCH: "PRODUCT_LAUNCH",
  FUNDING: "FUNDING",
  PRICING_CHANGE: "PRICING_CHANGE",
  HIRING: "HIRING",
  ACQUISITION: "ACQUISITION",
  LEADERSHIP: "LEADERSHIP",
  SENTIMENT: "SENTIMENT",
  OTHER: "OTHER"
});

/** Engine term → InsightFlow term (for docs and UI) */
export const engineToProduct = Object.freeze({
  Workflows: "ResearchWorkspace (backing DAG)",
  WorkflowExecution: "Run",
  TaskExecution: "RunStep",
  Tasks: "ResearchStep"
});
