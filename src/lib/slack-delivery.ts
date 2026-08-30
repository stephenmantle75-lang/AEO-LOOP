import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyPulseReport } from "./reporting";
import { formatDailyPulseMessage, formatFindingAlertText, postSlackMessage } from "./slack";

export type SlackDeliveryConfig = { token: string; channel: string; siteOrigin: string };

export type DeliverySummary = { sent: number; failed: number; skipped: number };

type OutboxRow = {
  id: string;
  report_id: string;
  event_id: string;
  status: string;
  payload: DailyPulseReport;
  attempt_count: number;
};

type FindingAlertRow = {
  id: string;
  event_id: string;
  status: string;
  payload: { title: string; priority: string; dashboardPath: string };
  attempt_count: number;
};

/** Claim one queued outbox row so two overlapping cron runs can't both send it. */
async function claimOutboxRow(client: SupabaseClient, id: string): Promise<boolean> {
  const { data, error } = await client
    .from("report_outbox")
    .update({ status: "processing", locked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "queued")
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}

/** Drain `report_outbox` (daily pulse) into Slack, recording each attempt in `delivery_events`. */
export async function deliverQueuedReports(
  client: SupabaseClient,
  config: SlackDeliveryConfig,
  limit = 5,
): Promise<DeliverySummary> {
  const summary: DeliverySummary = { sent: 0, failed: 0, skipped: 0 };
  const { data: rows, error } = await client
    .from("report_outbox")
    .select("id, report_id, event_id, status, payload, attempt_count")
    .eq("status", "queued")
    .order("available_at", { ascending: true })
    .limit(limit);
  if (error || !rows) return summary;

  for (const row of rows as OutboxRow[]) {
    if (!(await claimOutboxRow(client, row.id))) {
      summary.skipped += 1;
      continue;
    }
    const { text, blocks } = formatDailyPulseMessage(row.payload);
    const result = await postSlackMessage({ token: config.token, channel: config.channel, text, blocks });
    const now = new Date().toISOString();
    if (result.ok) {
      await client.from("report_outbox").update({ status: "sent", delivered_at: now }).eq("id", row.id);
      await client
        .from("delivery_events")
        .upsert(
          { report_id: row.report_id, outbox_id: row.id, event_id: row.event_id, channel: "slack", status: "sent", external_id: result.ts, delivered_at: now },
          { onConflict: "event_id,channel" },
        );
      summary.sent += 1;
    } else {
      await client
        .from("report_outbox")
        .update({ status: "failed", last_error: result.error, attempt_count: row.attempt_count + 1 })
        .eq("id", row.id);
      await client
        .from("delivery_events")
        .upsert(
          { report_id: row.report_id, outbox_id: row.id, event_id: row.event_id, channel: "slack", status: "failed", last_error: result.error },
          { onConflict: "event_id,channel" },
        );
      summary.failed += 1;
    }
  }
  return summary;
}

/** Drain the Slack-channel rows of `finding_delivery_events` — one short alert per approved finding. */
export async function deliverQueuedFindingAlerts(
  client: SupabaseClient,
  config: SlackDeliveryConfig,
  limit = 10,
): Promise<DeliverySummary> {
  const summary: DeliverySummary = { sent: 0, failed: 0, skipped: 0 };
  const { data: rows, error } = await client
    .from("finding_delivery_events")
    .select("id, event_id, status, payload, attempt_count")
    .eq("channel", "slack")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error || !rows) return summary;

  for (const row of rows as FindingAlertRow[]) {
    const { data: claimed } = await client
      .from("finding_delivery_events")
      .update({ status: "processing" })
      .eq("id", row.id)
      .eq("status", "queued")
      .select("id");
    if (!claimed?.length) {
      summary.skipped += 1;
      continue;
    }
    const text = formatFindingAlertText({ ...row.payload, siteOrigin: config.siteOrigin });
    const result = await postSlackMessage({ token: config.token, channel: config.channel, text });
    const now = new Date().toISOString();
    if (result.ok) {
      await client
        .from("finding_delivery_events")
        .update({ status: "sent", external_id: result.ts, delivered_at: now })
        .eq("id", row.id);
      summary.sent += 1;
    } else {
      await client
        .from("finding_delivery_events")
        .update({ status: "failed", last_error: result.error, attempt_count: row.attempt_count + 1 })
        .eq("id", row.id);
      summary.failed += 1;
    }
  }
  return summary;
}
