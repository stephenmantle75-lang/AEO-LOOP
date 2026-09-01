import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deliverQueuedFindingAlerts, deliverQueuedReports } from "../src/lib/slack-delivery";
import type { DailyPulseReport } from "../src/lib/reporting";

const config = { token: "xoxb-test", channel: "#aeo-growth-loop", siteOrigin: "https://aeo-loop.vercel.app" };

const report: DailyPulseReport = {
  schemaVersion: "daily-pulse.v1",
  eventId: "daily-pulse:run-1",
  reportType: "daily_pulse",
  runId: "run-1",
  health: "failed",
  window: { start: "2026-08-19T08:00:00.000Z", end: "2026-08-26T08:07:00.000Z", comparison: "previous_7_complete_days" },
  kpis: [],
  funnel: { stages: [], biggestLeak: { from: "cited", to: "clicked", status: "not_measurable" } },
  providerHealth: [],
  insights: [],
  actions: [],
  links: { dashboard: "https://aeo-loop.vercel.app/", run: "https://aeo-loop.vercel.app/runs/run-1", report: "https://aeo-loop.vercel.app/reports/run-1" },
};

/**
 * A thenable stand-in for a Supabase query builder: every chain method
 * (.select/.eq/.order/.limit/.upsert) is a no-op passthrough, `await`ing the
 * chain resolves to `result`. Matches exactly the chains slack-delivery.ts
 * calls — not a general-purpose Supabase mock.
 */
function query(result: unknown) {
  const q: any = Promise.resolve(result);
  for (const method of ["select", "eq", "order", "limit", "upsert"]) q[method] = () => q;
  return q;
}

/** update() must behave differently per call: first is the row claim (racy), second is the finalize write. */
function updateSequence(results: unknown[]) {
  let call = 0;
  return () => query(results[Math.min(call++, results.length - 1)]);
}

function fakeClient(table: Record<string, { select: unknown; update: unknown[] }>): SupabaseClient {
  return {
    from: (name: string) => {
      const t = table[name] ?? { select: { data: [], error: null }, update: [{ error: null }] };
      return { select: () => query(t.select), update: updateSequence(t.update), upsert: () => query({ error: null }) };
    },
  } as unknown as SupabaseClient;
}

describe("deliverQueuedReports", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends a queued report and marks the outbox row + delivery event sent", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, json: async () => ({ ok: true, ts: "111.1" }) }));
    const outboxRow = { id: "outbox-1", report_id: "report-1", event_id: "daily-pulse:run-1", status: "queued", payload: report, attempt_count: 0 };
    const client = fakeClient({ report_outbox: { select: { data: [outboxRow], error: null }, update: [{ data: [{ id: "outbox-1" }], error: null }] } });
    const summary = await deliverQueuedReports(client, config);
    expect(summary).toEqual({ sent: 1, failed: 0, skipped: 0, readError: false });
  });

  it("a failed run still ships its (labeled-failed) pulse", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, json: async () => ({ ok: true, ts: "111.2" }) }));
    const outboxRow = { id: "outbox-2", report_id: "report-2", event_id: "daily-pulse:run-2", status: "queued", payload: { ...report, health: "failed" }, attempt_count: 0 };
    const client = fakeClient({ report_outbox: { select: { data: [outboxRow], error: null }, update: [{ data: [{ id: "outbox-2" }], error: null }] } });
    const summary = await deliverQueuedReports(client, config);
    expect(summary.sent).toBe(1);
  });

  it("records a Slack-side send failure without throwing", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, json: async () => ({ ok: false, error: "channel_not_found" }) }));
    const outboxRow = { id: "outbox-3", report_id: "report-3", event_id: "daily-pulse:run-3", status: "queued", payload: report, attempt_count: 0 };
    const client = fakeClient({ report_outbox: { select: { data: [outboxRow], error: null }, update: [{ data: [{ id: "outbox-3" }], error: null }] } });
    const summary = await deliverQueuedReports(client, config);
    expect(summary).toEqual({ sent: 0, failed: 1, skipped: 0, readError: false });
    expect(consoleError).toHaveBeenCalledWith("Slack report send failed", { outboxId: "outbox-3", error: "channel_not_found" });
  });

  it("skips a row another cron run already claimed instead of double-sending", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const outboxRow = { id: "outbox-4", report_id: "report-4", event_id: "daily-pulse:run-4", status: "queued", payload: report, attempt_count: 0 };
    // the claim update() affects zero rows — another process already flipped status away from "queued"
    const client = fakeClient({ report_outbox: { select: { data: [outboxRow], error: null }, update: [{ data: [], error: null }] } });
    const summary = await deliverQueuedReports(client, config);
    expect(summary).toEqual({ sent: 0, failed: 0, skipped: 1, readError: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("is a no-op when the outbox is empty", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const client = fakeClient({ report_outbox: { select: { data: [], error: null }, update: [{ error: null }] } });
    const summary = await deliverQueuedReports(client, config);
    expect(summary).toEqual({ sent: 0, failed: 0, skipped: 0, readError: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("flags readError instead of silently returning zeros when the outbox read itself fails", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const client = fakeClient({ report_outbox: { select: { data: null, error: { message: "connection refused" } }, update: [{ error: null }] } });
    const summary = await deliverQueuedReports(client, config);
    expect(summary).toEqual({ sent: 0, failed: 0, skipped: 0, readError: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("marks a malformed report failed and continues with later queued reports", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSpy = vi.fn().mockResolvedValue({ status: 200, json: async () => ({ ok: true, ts: "111.3" }) });
    vi.stubGlobal("fetch", fetchSpy);
    const rows = [
      { id: "outbox-bad", report_id: "report-bad", event_id: "daily-pulse:bad", status: "queued", payload: null, attempt_count: 0 },
      { id: "outbox-good", report_id: "report-good", event_id: "daily-pulse:good", status: "queued", payload: report, attempt_count: 0 },
    ];
    const client = fakeClient({ report_outbox: { select: { data: rows, error: null }, update: [{ data: [{ id: "claimed" }], error: null }] } });

    const summary = await deliverQueuedReports(client, config);

    expect(summary).toEqual({ sent: 1, failed: 1, skipped: 0, readError: false });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith("Slack report preparation failed", { outboxId: "outbox-bad", error: "invalid_report_payload" });
  });
});

describe("deliverQueuedFindingAlerts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends a short alert per queued finding and marks it sent", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, json: async () => ({ ok: true, ts: "222.1" }) }));
    const findingRow = { id: "fde-1", event_id: "finding.created:f-1", status: "queued", payload: { title: "Improve answer-page evidence", priority: "high", dashboardPath: "/findings/f-1" }, attempt_count: 0 };
    const client = fakeClient({ finding_delivery_events: { select: { data: [findingRow], error: null }, update: [{ data: [{ id: "fde-1" }], error: null }] } });
    const summary = await deliverQueuedFindingAlerts(client, config);
    expect(summary).toEqual({ sent: 1, failed: 0, skipped: 0, readError: false });
  });

  it("records and logs a Slack-side send failure without throwing", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, json: async () => ({ ok: false, error: "invalid_auth" }) }));
    const findingRow = { id: "fde-2", event_id: "finding.created:f-2", status: "queued", payload: { title: "Improve answer-page evidence", priority: "high", dashboardPath: "/findings/f-2" }, attempt_count: 0 };
    const client = fakeClient({ finding_delivery_events: { select: { data: [findingRow], error: null }, update: [{ data: [{ id: "fde-2" }], error: null }] } });
    const summary = await deliverQueuedFindingAlerts(client, config);
    expect(summary).toEqual({ sent: 0, failed: 1, skipped: 0, readError: false });
    expect(consoleError).toHaveBeenCalledWith("Slack finding alert send failed", { rowId: "fde-2", error: "invalid_auth" });
  });

  it("flags readError instead of silently returning zeros when the read itself fails", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const client = fakeClient({ finding_delivery_events: { select: { data: null, error: { message: "connection refused" } }, update: [{ error: null }] } });
    const summary = await deliverQueuedFindingAlerts(client, config);
    expect(summary).toEqual({ sent: 0, failed: 0, skipped: 0, readError: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("marks a malformed finding failed and continues with later queued alerts", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSpy = vi.fn().mockResolvedValue({ status: 200, json: async () => ({ ok: true, ts: "222.2" }) });
    vi.stubGlobal("fetch", fetchSpy);
    const rows = [
      { id: "fde-bad", event_id: "finding.created:bad", status: "queued", payload: undefined, attempt_count: 0 },
      { id: "fde-good", event_id: "finding.created:good", status: "queued", payload: { title: "Improve answer-page evidence", priority: "high", dashboardPath: "/findings/f-3" }, attempt_count: 0 },
    ];
    const client = fakeClient({ finding_delivery_events: { select: { data: rows, error: null }, update: [{ data: [{ id: "claimed" }], error: null }] } });

    const summary = await deliverQueuedFindingAlerts(client, config);

    expect(summary).toEqual({ sent: 1, failed: 1, skipped: 0, readError: false });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith("Slack finding preparation failed", { rowId: "fde-bad", error: "invalid_finding_payload" });
  });
});
