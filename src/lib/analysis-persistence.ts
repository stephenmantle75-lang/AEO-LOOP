import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDraftAnalysis, toAnalysisRecordPayload, type DraftFinding } from "./analysis";
import type { ObservationRow, RunRow } from "./observatory";

export type AnalysisRecordRow = {
  id: string;
  analysis_key: string;
  run_id: string;
  status: "draft" | "approved" | "rejected";
  agent_version: string;
  model: string | null;
  prompt_version: string;
  review_mode: "draft_only" | "human_approved";
  cost_usd: number | string;
  observation_ids: string[];
  findings: DraftFinding[];
  analyzed_at: string;
  created_at: string;
  updated_at: string;
};

const runSelect = "id, run_key, run_type, status, started_at, created_at, completed_at, duration_ms, cost_usd, sources, agent_version, metadata, error_message";
const observationSelect = "id, run_id, topic_key, provider, observation_type, status, question, target_url, answer_text, mentioned, citation_found, citation_urls, citations, metrics, source_url, confidence, error_message, observed_at, created_at";

export class AnalysisRunNotFoundError extends Error {
  constructor() {
    super("Stored analysis run was not found");
    this.name = "AnalysisRunNotFoundError";
  }
}

export class AnalysisReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisReviewError";
  }
}

async function loadAnalysisInputs(client: SupabaseClient, runId: string): Promise<{ run: RunRow; observations: ObservationRow[] }> {
  const [runResult, observationsResult] = await Promise.all([
    client.from("runs").select(runSelect).eq("id", runId).single(),
    client.from("observations").select(observationSelect).eq("run_id", runId).order("created_at", { ascending: true }),
  ]);

  if (runResult.error?.code === "PGRST116") throw new AnalysisRunNotFoundError();
  if (runResult.error) throw new Error(`Analysis run could not be loaded: ${runResult.error.message}`);
  if (observationsResult.error) throw new Error(`Analysis observations could not be loaded: ${observationsResult.error.message}`);

  return {
    run: runResult.data as RunRow,
    observations: (observationsResult.data ?? []) as ObservationRow[],
  };
}

/** Build a review-only snapshot from one stored run without writing anywhere. */
export async function previewStoredRunAnalysis(client: SupabaseClient, runId: string) {
  const inputs = await loadAnalysisInputs(client, runId);
  return buildDraftAnalysis(inputs);
}

/** Persist one deterministic, evidence-linked analysis snapshot after a run closes. */
export async function persistClosedRunAnalysis(client: SupabaseClient, runId: string): Promise<AnalysisRecordRow> {
  const inputs = await loadAnalysisInputs(client, runId);
  const payload = toAnalysisRecordPayload(buildDraftAnalysis(inputs));
  const { data, error } = await client
    .from("analyses")
    .upsert({
      analysis_key: payload.analysisKey,
      run_id: payload.runId,
      status: payload.status,
      agent_version: payload.agentVersion,
      model: payload.model,
      prompt_version: payload.promptVersion,
      review_mode: payload.reviewMode,
      cost_usd: payload.costUsd,
      observation_ids: payload.observationIds,
      findings: payload.findings,
      analyzed_at: payload.analyzedAt,
    }, { onConflict: "analysis_key" })
    .select("id, analysis_key, run_id, status, agent_version, model, prompt_version, review_mode, cost_usd, observation_ids, findings, analyzed_at, created_at, updated_at")
    .single();

  if (error) throw new Error(`Analysis could not be persisted: ${error.message}`);
  return data as AnalysisRecordRow;
}

export async function getPersistedAnalysisForRun(client: SupabaseClient, runId: string): Promise<AnalysisRecordRow | null> {
  const { data, error } = await client
    .from("analyses")
    .select("id, analysis_key, run_id, status, agent_version, model, prompt_version, review_mode, cost_usd, observation_ids, findings, analyzed_at, created_at, updated_at")
    .eq("run_id", runId)
    .order("analyzed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Analysis could not be loaded: ${error.message}`);
  return (data as AnalysisRecordRow | null) ?? null;
}

export async function reviewPersistedAnalysis({
  client,
  runId,
  reviewerId,
  decision,
  reviewNote,
}: {
  client: SupabaseClient;
  runId: string;
  reviewerId: string;
  decision: "approved" | "rejected";
  reviewNote: string;
}): Promise<{ analysisId: string; runId: string; status: "approved" | "rejected"; findingCount: number }> {
  const { data, error } = await client.rpc("review_analysis", {
    p_run_id: runId,
    p_reviewer_id: reviewerId,
    p_decision: decision,
    p_review_note: reviewNote,
  });

  if (error || !data || typeof data !== "object") {
    throw new AnalysisReviewError("Analysis review could not be completed");
  }

  const result = data as { analysis_id?: unknown; run_id?: unknown; status?: unknown; finding_count?: unknown };
  if (typeof result.analysis_id !== "string" || typeof result.run_id !== "string" || (result.status !== "approved" && result.status !== "rejected") || typeof result.finding_count !== "number") {
    throw new AnalysisReviewError("Analysis review returned an invalid result");
  }

  return {
    analysisId: result.analysis_id,
    runId: result.run_id,
    status: result.status,
    findingCount: result.finding_count,
  };
}
