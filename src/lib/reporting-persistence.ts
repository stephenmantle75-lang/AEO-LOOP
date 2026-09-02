import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyPulseReport } from "./reporting";
import { buildDailyPulseReport, buildPortfolioStats, type PortfolioStats } from "./reporting";
import type { FindingRow, ObservationRow, RunRow } from "./observatory";

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

const runSelect = "id, run_key, run_type, status, started_at, created_at, completed_at, duration_ms, cost_usd, sources, agent_version, metadata, error_message";
const observationSelect = "id, run_id, topic_key, provider, observation_type, status, question, target_url, answer_text, mentioned, citation_found, citation_urls, citations, metrics, source_url, confidence, error_message, observed_at, created_at";
const findingSelect = "id, run_id, topic_key, kind, title, summary, recommendation, priority, status, evidence_ids, expected_impact, confidence, linear_issue_url, slack_delivery_status, created_at";

/** Return only the versioned, sanitized report contract for persistence. */
export function toReportPayload(report: DailyPulseReport): DailyPulseReport {
  return {
    schemaVersion: report.schemaVersion,
    eventId: report.eventId,
    reportType: report.reportType,
    runId: report.runId,
    health: report.health,
    ...(report.comparison ? { comparison: { ...report.comparison } } : {}),
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
    ...(report.portfolio
      ? {
          portfolio: {
            ...report.portfolio,
            runStatuses: { ...report.portfolio.runStatuses },
            slackDelivery: { ...report.portfolio.slackDelivery },
          },
        }
      : {}),
  };
}

export async function loadReportInputs(client: SupabaseClient, runId: string): Promise<{ run: RunRow; observations: ObservationRow[]; findings: FindingRow[]; portfolio?: PortfolioStats }> {
export async function loadReportInputs(client: SupabaseClient, runId: string): Promise<{ run: RunRow; observations: ObservationRow[]; findings: FindingRow[] }> {
  const [runResult, observationsResult, findingsResult] = await Promise.all([
    client.from("runs").select(runSelect).eq("id", runId).single(),
    client.from("observations").select(observationSelect).eq("run_id", runId).order("created_at", { ascending: true }),
    // Findings are a current work queue, not run-local evidence. A report's
    // NEXT DECISIONS section must therefore match the dashboard's global open
    // finding count, including findings created by an earlier run.
    client.from("findings").select(findingSelect).order("created_at", { ascending: true }),
  ]);

  if (runResult.error) throw new Error(`Report run could not be loaded: ${runResult.error.message}`);
  if (observationsResult.error) throw new Error(`Report observations could not be loaded: ${observationsResult.error.message}`);
  if (findingsResult.error) throw new Error(`Report findings could not be loaded: ${findingsResult.error.message}`);

  let portfolio: PortfolioStats | undefined;
  try {
    const [runsResult, allObservationsResult, outboxResult, findingDeliveriesResult] = await Promise.all([
      client.from("runs").select("status, started_at, cost_usd"),
      client.from("observations").select("status"),
      client.from("report_outbox").select("status"),
      client.from("finding_delivery_events").select("channel, status").eq("channel", "slack"),
    ]);
    if (runsResult.error) throw new Error(`Portfolio runs could not be loaded: ${runsResult.error.message}`);
    if (allObservationsResult.error) throw new Error(`Portfolio observations could not be loaded: ${allObservationsResult.error.message}`);
    if (outboxResult.error) throw new Error(`Portfolio report delivery could not be loaded: ${outboxResult.error.message}`);
    if (findingDeliveriesResult.error) throw new Error(`Portfolio finding delivery could not be loaded: ${findingDeliveriesResult.error.message}`);
    portfolio = buildPortfolioStats({
      runs: (runsResult.data ?? []) as Pick<RunRow, "status" | "started_at" | "cost_usd">[],
      observations: (allObservationsResult.data ?? []) as Pick<ObservationRow, "status">[],
      findings: (findingsResult.data ?? []) as FindingRow[],
      reportOutbox: (outboxResult.data ?? []) as Array<{ status: string }>,
      findingDeliveries: (findingDeliveriesResult.data ?? []) as Array<{ channel: string; status: string }>,
      asOf: runResult.data.completed_at ?? runResult.data.started_at,
    });
  } catch (error) {
    // Aggregate context improves the report but must not make a valid run
    // undeliverable when one auxiliary read has a transient failure.
    console.error("Portfolio report totals unavailable", error);
  }

  return {
    run: runResult.data as RunRow,
    observations: (observationsResult.data ?? []) as ObservationRow[],
    findings: (findingsResult.data ?? []) as FindingRow[],
    portfolio,
  };
}

/** Build and persist one report only after the collection run has been closed. */
export async function persistClosedRunReport(client: SupabaseClient, runId: string, dashboardOrigin = ""): Promise<{ report: ReportRow; outbox: ReportOutboxRow }> {
  const inputs = await loadReportInputs(client, runId);
  const report = buildDailyPulseReport({ ...inputs, dashboardOrigin });
  const persisted = await persistReport(client, report);
  const outbox = await enqueueReportDelivery(client, persisted);
  return { report: persisted, outbox };
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
