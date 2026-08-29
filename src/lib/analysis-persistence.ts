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

async function loadAnalysisInputs(client: SupabaseClient, runId: string): Promise<{ run: RunRow; observations: ObservationRow[] }> {
  const [runResult, observationsResult] = await Promise.all([
    client.from("runs").select(runSelect).eq("id", runId).single(),
    client.from("observations").select(observationSelect).eq("run_id", runId).order("created_at", { ascending: true }),
  ]);

  if (runResult.error) throw new Error(`Analysis run could not be loaded: ${runResult.error.message}`);
  if (observationsResult.error) throw new Error(`Analysis observations could not be loaded: ${observationsResult.error.message}`);

  return {
    run: runResult.data as RunRow,
    observations: (observationsResult.data ?? []) as ObservationRow[],
  };
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
