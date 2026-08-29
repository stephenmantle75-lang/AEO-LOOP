import type { SupabaseClient } from "@supabase/supabase-js";

export type Run = { id: string; run_key: string; run_type: string; status: string; started_at: string; completed_at?: string | null; duration_ms?: number | null; cost_usd?: number | null; sources: string[]; metadata: Record<string, unknown> };
export type ClaimResult = { run: Run | null; claimed: boolean; reason: "claimed" | "duplicate" | "overlap" };

export async function claimDailyRun(client: SupabaseClient, runKey: string, sources: string[], metadata: Record<string, unknown>): Promise<ClaimResult> {
  const { data, error } = await client.rpc("claim_daily_run", { p_run_key: runKey, p_sources: sources, p_metadata: metadata });
  if (error) throw new Error(`Could not claim daily run: ${error.message}`);
  if (!data || typeof data !== "object") throw new Error("Daily run claim returned an invalid response");
  return data as ClaimResult;
}

export async function claimExperimentRun(client: SupabaseClient, runKey: string, sources: string[], metadata: Record<string, unknown>): Promise<ClaimResult> {
  const { data, error } = await client.rpc("claim_experiment_run", { p_run_key: runKey, p_sources: sources, p_metadata: metadata });
  if (error) throw new Error(`Could not claim experiment run: ${error.message}`);
  if (!data || typeof data !== "object") throw new Error("Experiment run claim returned an invalid response");
  return data as ClaimResult;
}

export async function insertObservation(client: SupabaseClient, row: Record<string, unknown>): Promise<string> {
  const { data, error } = await client.from("observations").insert(row).select("id").single();
  if (error) throw new Error(`Could not record observation: ${error.message}`);
  return String(data.id);
}

export async function completeRun(client: SupabaseClient, runId: string, status: "succeeded" | "partial" | "failed", startedAt: number, sources: string[], costUsd: number, errorMessage?: string): Promise<void> {
  const { error } = await client.from("runs").update({ status, completed_at: new Date().toISOString(), duration_ms: Date.now() - startedAt, sources, cost_usd: costUsd, error_message: errorMessage ?? null }).eq("id", runId);
  if (error) throw new Error(`Could not complete run: ${error.message}`);
}
