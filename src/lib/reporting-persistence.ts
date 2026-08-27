import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyPulseReport } from "./reporting";

export type ReportRow = {
  id: string;
  run_id: string;
  event_id: string;
  report_type: "daily_pulse";
  schema_version: string;
  health: string;
  payload: DailyPulseReport;
  content_hash: string | null;
  generated_at: string;
  created_at: string;
};

export type ReportOutboxRow = {
  id: string;
  report_id: string;
  event_id: string;
  status: "queued" | "processing" | "sent" | "failed" | "cancelled";
  payload: DailyPulseReport;
  attempt_count: number;
  available_at: string;
  locked_at: string | null;
  delivered_at: string | null;
  last_error: string | null;
};

export type DeliveryChannel = "slack" | "linear" | "zapier";

/** Return only the versioned, sanitized report contract for persistence. */
export function toReportPayload(report: DailyPulseReport): DailyPulseReport {
  return {
    schemaVersion: report.schemaVersion,
    eventId: report.eventId,
    reportType: report.reportType,
    runId: report.runId,
    health: report.health,
    window: { ...report.window },
    kpis: report.kpis.map((kpi) => ({ ...kpi })),
    funnel: {
      stages: report.funnel.stages.map((stage) => ({ ...stage })),
      biggestLeak: { ...report.funnel.biggestLeak },
    },
    providerHealth: report.providerHealth.map((provider) => ({ ...provider })),
    insights: report.insights.map((insight) => ({ ...insight })),
    actions: report.actions.map((action) => ({ ...action })),
    links: { ...report.links },
  };
}

/**
 * These helpers are staged separately from the cron close path. Wire them in
 * only after the migration is applied and the human approval/delivery policy
 * has been reviewed.
 */
export async function persistReport(client: SupabaseClient, report: DailyPulseReport): Promise<ReportRow> {
  const payload = toReportPayload(report);
  const { data, error } = await client
    .from("reports")
    .upsert({
      run_id: payload.runId,
      event_id: payload.eventId,
      report_type: payload.reportType,
      schema_version: payload.schemaVersion,
      health: payload.health,
      payload,
      generated_at: payload.window.end,
    }, { onConflict: "run_id" })
    .select("id, run_id, event_id, report_type, schema_version, health, payload, content_hash, generated_at, created_at")
    .single();
  if (error) throw new Error(`Report could not be persisted: ${error.message}`);
  return data as ReportRow;
}

export async function enqueueReportDelivery(client: SupabaseClient, report: ReportRow): Promise<ReportOutboxRow> {
  const { data, error } = await client
    .from("report_outbox")
    .upsert({
      report_id: report.id,
      event_id: report.event_id,
      status: "queued",
      payload: toReportPayload(report.payload),
    }, { onConflict: "event_id" })
    .select("id, report_id, event_id, status, payload, attempt_count, available_at, locked_at, delivered_at, last_error")
    .single();
  if (error) throw new Error(`Report delivery could not be queued: ${error.message}`);
  return data as ReportOutboxRow;
}

export async function recordDeliveryEvent(client: SupabaseClient, report: ReportRow, outbox: ReportOutboxRow, channel: DeliveryChannel) {
  const { data, error } = await client
    .from("delivery_events")
    .upsert({
      report_id: report.id,
      outbox_id: outbox.id,
      event_id: report.event_id,
      channel,
      status: "queued",
    }, { onConflict: "event_id,channel" })
    .select("id, report_id, outbox_id, event_id, channel, status, external_id, attempt_count, response_metadata, last_error, delivered_at, created_at, updated_at")
    .single();
  if (error) throw new Error(`Delivery event could not be recorded: ${error.message}`);
  return data;
}
