import type { SupabaseClient } from "@supabase/supabase-js";

export type Run = { id: string; run_key: string; run_type: string; status: string; started_at: string; heartbeat_at?: string | null; completed_at?: string | null; duration_ms?: number | null; cost_usd?: number | null; sources: string[]; metadata: Record<string, unknown> };
export type ClaimResult = { run: Run | null; claimed: boolean; reason: "claimed" | "duplicate" | "overlap" };
const HEARTBEAT_INTERVAL_MS = 15_000;

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

export async function touchRunHeartbeat(client: SupabaseClient, runId: string): Promise<void> {
  const { error } = await client
    .from("runs")
    .update({ heartbeat_at: new Date().toISOString() })
    .eq("id", runId)
    .eq("status", "running");
  if (error) throw new Error(`Could not update run heartbeat: ${error.message}`);
}

export function startRunHeartbeat(client: SupabaseClient, runId: string, intervalMs = HEARTBEAT_INTERVAL_MS): () => Promise<void> {
  let pending = Promise.resolve();
  const timer = setInterval(() => {
    pending = pending
      .catch(() => undefined)
      .then(() => touchRunHeartbeat(client, runId))
      .catch((error) => console.error("Run heartbeat update failed", error));
  }, intervalMs);

  return async () => {
    clearInterval(timer);
    await pending;
  };
}

export async function completeRun(client: SupabaseClient, runId: string, status: "succeeded" | "partial" | "failed", startedAt: number, sources: string[], costUsd: number, errorMessage?: string): Promise<void> {
  const completedAt = new Date().toISOString();
  const { error } = await client.from("runs").update({ status, heartbeat_at: completedAt, completed_at: completedAt, duration_ms: Date.now() - startedAt, sources, cost_usd: costUsd, error_message: errorMessage ?? null }).eq("id", runId);
  if (error) throw new Error(`Could not complete run: ${error.message}`);
}
