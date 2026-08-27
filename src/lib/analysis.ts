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
