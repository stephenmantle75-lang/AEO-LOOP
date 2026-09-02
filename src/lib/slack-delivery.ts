import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyPulseReport } from "./reporting";
import { formatCombinedDailyPulseMessage, formatDailyPulseMessage, formatFindingAlertText, postSlackMessage } from "./slack";
import { logServerError } from "./api-response";

export type SlackDeliveryConfig = { token: string; channel: string; siteOrigin: string };

/** readError is true when the initial Supabase read itself failed — distinct from a
 *  genuinely empty queue, which is sent:0/failed:0/skipped:0/readError:false too but
 *  for the opposite reason. Check readError before reading a zero summary as "nothing to do". */
export type DeliverySummary = { sent: number; failed: number; skipped: number; readError: boolean };

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

type DeliveryWrite = { error?: { message?: string } | null };

/** Delivery state must never turn a successful Slack post into a crashed cron. */
async function safeDeliveryWrite(context: string, write: () => PromiseLike<DeliveryWrite>): Promise<void> {
  try {
    const result = await write();
    if (result.error) logServerError(context, result.error);
  } catch (error) {
    logServerError(context, error);
  }
}

async function markReportRowFailed(client: SupabaseClient, row: OutboxRow, error: string): Promise<void> {
  const now = new Date().toISOString();
  await safeDeliveryWrite("report_outbox failure write failed", () =>
    client.from("report_outbox").update({ status: "failed", last_error: error, attempt_count: row.attempt_count + 1 }).eq("id", row.id),
  );
  await safeDeliveryWrite("report delivery failure event write failed", () =>
    client.from("delivery_events").upsert(
      { report_id: row.report_id, outbox_id: row.id, event_id: row.event_id, channel: "slack", status: "failed", last_error: error, created_at: now },
      { onConflict: "event_id,channel" },
    ),
  );
}

async function markReportRowSent(client: SupabaseClient, row: OutboxRow, ts: string, now: string): Promise<void> {
  await safeDeliveryWrite("report_outbox sent-state write failed", () => client.from("report_outbox").update({ status: "sent", delivered_at: now }).eq("id", row.id));
  await safeDeliveryWrite("report delivery sent-event write failed", () =>
    client.from("delivery_events").upsert(
      { report_id: row.report_id, outbox_id: row.id, event_id: row.event_id, channel: "slack", status: "sent", external_id: ts, delivered_at: now },
      { onConflict: "event_id,channel" },
    ),
  );
}

async function markFindingRowFailed(client: SupabaseClient, row: FindingAlertRow, error: string): Promise<void> {
  await safeDeliveryWrite("finding delivery failure write failed", () =>
    client.from("finding_delivery_events").update({ status: "failed", last_error: error, attempt_count: row.attempt_count + 1 }).eq("id", row.id),
  );
}

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

function reportGroupKey(row: OutboxRow): string | null {
  const key = row.payload?.comparison?.key;
  return typeof key === "string" && key ? key : null;
}

function groupReportRows(rows: OutboxRow[]): OutboxRow[][] {
  const groups: OutboxRow[][] = [];
  const byComparison = new Map<string, OutboxRow[]>();
  for (const row of rows) {
    const key = reportGroupKey(row);
    if (!key) {
      groups.push([row]);
      continue;
    }
    const existing = byComparison.get(key);
    if (existing) existing.push(row);
    else {
      const group = [row];
      byComparison.set(key, group);
      groups.push(group);
    }
  }
  return groups;
}

/** Drain `report_outbox` (daily pulse) into Slack, recording each attempt in `delivery_events`. */
export async function deliverQueuedReports(
  client: SupabaseClient,
  config: SlackDeliveryConfig,
  limit = 5,
): Promise<DeliverySummary> {
  const summary: DeliverySummary = { sent: 0, failed: 0, skipped: 0, readError: false };
  const { data: rows, error } = await client
    .from("report_outbox")
    .select("id, report_id, event_id, status, payload, attempt_count")
    .eq("status", "queued")
    .order("available_at", { ascending: true })
    .limit(limit);
  if (error || !rows) {
    if (error) logServerError("report_outbox read failed", error);
    return { ...summary, readError: true };
  }

  for (const group of groupReportRows(rows as OutboxRow[])) {
    const claimedRows: OutboxRow[] = [];
    try {
      for (const row of group) {
        if (await claimOutboxRow(client, row.id)) claimedRows.push(row);
        else summary.skipped += 1;
      }
      if (!claimedRows.length) continue;

      let message: ReturnType<typeof formatDailyPulseMessage>;
      try {
        message = claimedRows.length === 1 && !claimedRows[0].payload?.comparison
          ? formatDailyPulseMessage(claimedRows[0].payload)
          : formatCombinedDailyPulseMessage(claimedRows.map((row) => row.payload));
      } catch {
        await Promise.all(claimedRows.map((row) => markReportRowFailed(client, row, "invalid_report_payload")));
        if (claimedRows.length === 1) console.error("Slack report preparation failed", { outboxId: claimedRows[0].id, error: "invalid_report_payload" });
        else console.error("Slack report preparation failed", { outboxIds: claimedRows.map((row) => row.id), error: "invalid_report_payload" });
        summary.failed += claimedRows.length;
        continue;
      }

      const result = await postSlackMessage({ token: config.token, channel: config.channel, ...message });
      const now = new Date().toISOString();
      if (result.ok) {
        await Promise.all(claimedRows.map((row) => markReportRowSent(client, row, result.ts, now)));
        summary.sent += claimedRows.length;
      } else {
        await Promise.all(claimedRows.map((row) => markReportRowFailed(client, row, result.error)));
        // Slack's error codes (invalid_auth, not_in_channel, ...) are short, safe enum
        // strings — fine to log directly, unlike the DB errors above which go through
        // logServerError to keep provider/schema details out of logs.
        if (claimedRows.length === 1) console.error("Slack report send failed", { outboxId: claimedRows[0].id, error: result.error });
        else console.error("Slack report send failed", { outboxIds: claimedRows.map((row) => row.id), error: result.error });
        summary.failed += claimedRows.length;
      }
    } catch (error) {
      // A malformed row, transient client exception, or unexpected formatter change
      // must not prevent later queued reports from being attempted.
      await Promise.all(claimedRows.map((row) => markReportRowFailed(client, row, "delivery_processing_error")));
      logServerError("Slack report delivery row failed", error);
      summary.failed += claimedRows.length;
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
  const summary: DeliverySummary = { sent: 0, failed: 0, skipped: 0, readError: false };
  const { data: rows, error } = await client
    .from("finding_delivery_events")
    .select("id, event_id, status, payload, attempt_count")
    .eq("channel", "slack")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error || !rows) {
    if (error) logServerError("finding_delivery_events read failed", error);
    return { ...summary, readError: true };
  }

  for (const row of rows as FindingAlertRow[]) {
    let claimed = false;
    try {
      const { data: claimedRows } = await client
        .from("finding_delivery_events")
        .update({ status: "processing" })
        .eq("id", row.id)
        .eq("status", "queued")
        .select("id");
      if (!claimedRows?.length) {
        summary.skipped += 1;
        continue;
      }
      claimed = true;

      let text: string;
      try {
        if (!row.payload || typeof row.payload.title !== "string" || typeof row.payload.priority !== "string" || typeof row.payload.dashboardPath !== "string") {
          throw new Error("finding payload shape is invalid");
        }
        text = formatFindingAlertText({ ...row.payload, siteOrigin: config.siteOrigin });
      } catch {
        await markFindingRowFailed(client, row, "invalid_finding_payload");
        console.error("Slack finding preparation failed", { rowId: row.id, error: "invalid_finding_payload" });
        summary.failed += 1;
        continue;
      }

      const result = await postSlackMessage({ token: config.token, channel: config.channel, text });
      const now = new Date().toISOString();
      if (result.ok) {
        await safeDeliveryWrite("finding delivery sent-state write failed", () =>
          client.from("finding_delivery_events").update({ status: "sent", external_id: result.ts, delivered_at: now }).eq("id", row.id),
        );
        summary.sent += 1;
      } else {
        await markFindingRowFailed(client, row, result.error);
        console.error("Slack finding alert send failed", { rowId: row.id, error: result.error });
        summary.failed += 1;
      }
    } catch (error) {
      if (claimed) await markFindingRowFailed(client, row, "delivery_processing_error");
      logServerError("Slack finding delivery row failed", error);
      summary.failed += 1;
    }
  }
  return summary;
}
