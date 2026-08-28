import type { ObservationRow, RunRow } from "./observatory";

export type DraftFinding = {
  id: string;
  runId: string;
  topicKey: string;
  kind: "citation_gap" | "technical";
  title: string;
  summary: string;
  recommendation: string;
  priority: "medium" | "high";
  evidenceIds: string[];
  confidence: number;
  status: "draft";
};

export type AnalysisMetadata = {
  analysisId: string;
  runId: string;
  agentVersion: string;
  model: string | null;
  promptVersion: string;
  costUsd: number;
  analyzedAt: string;
  reviewMode: "draft_only";
};

export type DraftAnalysis = {
  metadata: AnalysisMetadata;
  findings: DraftFinding[];
};

export type AnalysisRecordPayload = AnalysisMetadata & {
  analysisKey: string;
  status: "draft";
  observationIds: string[];
  findings: DraftFinding[];
};

export const DRAFT_ANALYSIS_AGENT_VERSION = "deterministic-review-v1";
export const DRAFT_ANALYSIS_PROMPT_VERSION = "evidence-to-finding.v1";

/**
 * Produces review-only findings from stored observations.
 *
 * This is deliberately deterministic while the analysis-agent contract is
 * being established. It never calls a provider, writes to Supabase, opens a
 * Linear issue, or sends Slack/Zapier delivery. Every draft points back to
 * the exact observation rows that caused it.
 */
export function buildDraftFindings({ run, observations }: { run: RunRow; observations: ObservationRow[] }): DraftFinding[] {
  const drafts: DraftFinding[] = [];
  const firecrawl = observations.filter((observation) => observation.provider === "firecrawl");
  const exa = observations.filter((observation) => observation.provider === "exa" && observation.observation_type === "citation_check");
  const observedExa = exa.filter((observation) => observation.status === "observed");
  const uncited = observedExa.filter((observation) => !observation.citation_found);
  const failedFirecrawl = firecrawl.filter((observation) => observation.status === "failed");

  if (failedFirecrawl.length) {
    drafts.push({
      id: `draft:${run.id}:technical-target-integrity`,
      runId: run.id,
      topicKey: failedFirecrawl[0].topic_key,
      kind: "technical",
      title: "Target page integrity needs review",
      summary: `${failedFirecrawl.length} Firecrawl page-integrity check${failedFirecrawl.length === 1 ? "" : "s"} failed. Citation conclusions should not be treated as complete until the target remains inspectable.`,
      recommendation: "Review the stored Firecrawl error and target deployment, then rerun the same fixed prompt set before changing page content.",
      priority: "high",
      evidenceIds: failedFirecrawl.map((observation) => observation.id),
      confidence: 0.98,
      status: "draft",
    });
  }

  if (uncited.length) {
    drafts.push({
      id: `draft:${run.id}:citation-gap`,
      runId: run.id,
      topicKey: uncited[0].topic_key,
      kind: "citation_gap",
      title: "No target citation in the current prompt checks",
      summary: `${uncited.length} of ${observedExa.length} observed Exa prompt check${observedExa.length === 1 ? "" : "s"} did not cite the target page. This is an evidence-backed baseline, not proof that the page is technically broken.`,
      recommendation: "Create a separately deployed answer-page variant with a concise answer-first block, explicit SEO/AEO comparison, firsthand evidence, and an FAQ; keep the current page as the control and retest both URLs.",
      priority: "medium",
      evidenceIds: uncited.map((observation) => observation.id),
      confidence: 0.84,
      status: "draft",
    });
  }

  return drafts;
}

/**
 * Wraps the review-only rules in the metadata shape required by ANT-36.
 *
 * The metadata is intentionally explicit about the current boundary: this is
 * not a model call and is not persisted as an analysis record yet. Keeping a
 * stable analysis ID and versioned rule/prompt labels makes the next durable
 * analysis table and human approval step additive rather than ambiguous.
 */
export function buildDraftAnalysis({
  run,
  observations,
  analyzedAt = run.completed_at ?? run.created_at,
}: {
  run: RunRow;
  observations: ObservationRow[];
  analyzedAt?: string;
}): DraftAnalysis {
  const findings = buildDraftFindings({ run, observations });

  if (findings.some((finding) => finding.evidenceIds.length === 0)) {
    throw new Error("Draft findings must retain at least one source observation");
  }

  return {
    metadata: {
      analysisId: `draft-analysis:${run.id}`,
      runId: run.id,
      agentVersion: DRAFT_ANALYSIS_AGENT_VERSION,
      model: null,
      promptVersion: DRAFT_ANALYSIS_PROMPT_VERSION,
      costUsd: 0,
      analyzedAt,
      reviewMode: "draft_only",
    },
    findings,
  };
}

/** Return the database-safe snapshot for a future approved persistence step. */
export function toAnalysisRecordPayload(analysis: DraftAnalysis): AnalysisRecordPayload {
  const observationIds = [...new Set(analysis.findings.flatMap((finding) => finding.evidenceIds))];

  if (!observationIds.length && analysis.findings.length > 0) {
    throw new Error("Analysis records with findings must retain source observation IDs");
  }

  return {
    ...analysis.metadata,
    analysisKey: analysis.metadata.analysisId,
    status: "draft",
    observationIds,
    findings: analysis.findings.map((finding) => ({ ...finding, evidenceIds: [...finding.evidenceIds] })),
  };
}
