/**
 * Canonical InsightFlow research DAG recipes (M2).
 *
 * M0: structure and step names only — task types are interim/planned placeholders.
 * Workspaces will instantiate a recipe on create (M1–M2).
 */

/** Standard research pipeline — all entity types share this shape in MVP */
export const standardResearchDag = {
  id: "standard-research-v1",
  name: "Standard Research Pipeline",
  description:
    "Source discovery → parallel collection → extraction → validation → graph → change detection → report",
  steps: [
    {
      name: "sourceDiscovery",
      plannedType: "SOURCE_DISCOVERY",
      interimType: null,
      dependencies: [],
      description: "Discover seed URLs, feeds, and queries from research goal"
    },
    {
      name: "collectNews",
      plannedType: "COLLECT_NEWS",
      interimType: "HTTP_REQUEST",
      dependencies: ["sourceDiscovery"],
      description: "Collect news articles"
    },
    {
      name: "collectWeb",
      plannedType: "COLLECT_WEB",
      interimType: "HTTP_REQUEST",
      dependencies: ["sourceDiscovery"],
      description: "Collect company/market web pages"
    },
    {
      name: "collectBlogs",
      plannedType: "COLLECT_BLOGS",
      interimType: "HTTP_REQUEST",
      dependencies: ["sourceDiscovery"],
      description: "Collect blog posts from RSS"
    },
    {
      name: "collectReddit",
      plannedType: "COLLECT_REDDIT",
      interimType: "HTTP_REQUEST",
      dependencies: ["sourceDiscovery"],
      description: "Collect Reddit discussions"
    },
    {
      name: "extractClaims",
      plannedType: "EXTRACT_CLAIMS",
      interimType: "TRANSFORM",
      dependencies: ["collectNews", "collectWeb", "collectBlogs", "collectReddit"],
      description: "Extract entities, claims, and events from collected documents"
    },
    {
      name: "validateEvidence",
      plannedType: "VALIDATE_EVIDENCE",
      interimType: "TRANSFORM",
      dependencies: ["extractClaims"],
      description: "Cross-source validation and confidence scoring"
    },
    {
      name: "updateGraph",
      plannedType: "UPDATE_GRAPH",
      interimType: "TRANSFORM",
      dependencies: ["validateEvidence"],
      description: "Upsert knowledge graph"
    },
    {
      name: "detectChanges",
      plannedType: "DETECT_CHANGES",
      interimType: "TRANSFORM",
      dependencies: ["updateGraph"],
      description: "Detect meaningful changes vs previous run"
    },
    {
      name: "generateReport",
      plannedType: "GENERATE_REPORT",
      interimType: "WEBHOOK_EMIT",
      dependencies: ["detectChanges"],
      description: "Generate intelligence brief and alerts"
    }
  ]
};

export const researchRecipes = [
  {
    slug: "standard-research",
    entityTypes: ["company", "market", "technology"],
    dag: standardResearchDag
  }
];

export function getResearchRecipe(slug = "standard-research") {
  return researchRecipes.find((r) => r.slug === slug) ?? null;
}

/**
 * Convert recipe to engine workflow payload (uses interim types until M2 native tasks).
 * Not wired to workspace API yet — M2 will call this when provisioning DAGs.
 */
export function recipeToWorkflowPayload(recipe, { name, description }) {
  const dag = recipe.dag;
  return {
    name,
    description: description ?? dag.description,
    tasks: dag.steps
      .map((step) => ({
        name: step.name,
        type: step.interimType ?? step.plannedType,
        dependencies: step.dependencies,
        config: { plannedType: step.plannedType, _recipe: dag.id }
      }))
      .filter((t) => t.type !== null)
  };
}
