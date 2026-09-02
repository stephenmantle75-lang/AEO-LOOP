import { afterEach, describe, expect, it, vi } from "vitest";
import { checkSlackAuth, formatCombinedDailyPulseMessage, formatDailyPulseMessage, formatFindingAlertText, postSlackMessage } from "../src/lib/slack";
import type { DailyPulseReport } from "../src/lib/reporting";

const report: DailyPulseReport = {
  schemaVersion: "daily-pulse.v1",
  eventId: "daily-pulse:run-1",
  reportType: "daily_pulse",
  runId: "run-1",
  health: "partial",
  window: { start: "2026-08-19T08:00:00.000Z", end: "2026-08-26T08:07:00.000Z", comparison: "previous_7_complete_days" },
  kpis: [
    { key: "synthetic_citation_rate", label: "Citation rate", value: 0.2, displayValue: "2/10", delta: 0.1, unit: "rate", denominator: 10, source: "observations.citation_check", freshness: "2026-08-26T08:07:00.000Z", status: "observed" },
  ],
  funnel: {
    stages: [{ key: "cited", label: "Cited", value: 2, status: "observed" }],
    biggestLeak: { from: "cited", to: "clicked", status: "not_measurable" },
  },
  providerHealth: [],
  insights: [],
  actions: [{ title: "Review finding F-1", status: "new", priority: "high" }],
  links: { dashboard: "https://aeo-loop.vercel.app/", run: "https://aeo-loop.vercel.app/runs/run-1", report: "https://aeo-loop.vercel.app/reports/run-1" },
};

describe("formatDailyPulseMessage", () => {
  it("labels a partial run and includes every KPI, the funnel, and the links", () => {
    const { text, blocks } = formatDailyPulseMessage(report);
    expect(text).toContain("partial");
    const flat = JSON.stringify(blocks);
    expect(flat).toContain("Citation rate");
    expect(flat).toContain("2/10");
    expect(flat).toContain("Review finding F-1");
    expect(flat).toContain(report.links.dashboard);
    expect(flat).toContain(report.links.run);
  });

  it("marks a not-measurable leak instead of inventing a number", () => {
    const { blocks } = formatDailyPulseMessage(report);
    expect(JSON.stringify(blocks)).toContain("not measurable yet");
  });

  it("drops the actions block instead of sending relative button URLs Slack would reject", () => {
    // Production bug: a report built with an empty dashboardOrigin persists
    // links like "/runs/run-1" instead of an absolute URL. Slack's
    // chat.postMessage returns invalid_blocks for a relative button url and
    // kills the whole message — this must never reach that call again.
    const broken = { ...report, links: { dashboard: "/", run: "/runs/run-1", report: "/reports/run-1" } };
    const { blocks } = formatDailyPulseMessage(broken);
    expect(blocks.some((block) => block.type === "actions")).toBe(false);
  });

  it("keeps only the buttons with an absolute URL when links are partially broken", () => {
    const mixed = { ...report, links: { ...report.links, run: "/runs/run-1" } };
    const { blocks } = formatDailyPulseMessage(mixed);
    const actions = blocks.find((block) => block.type === "actions") as { elements: { url: string }[] } | undefined;
    expect(actions?.elements.map((element) => element.url)).toEqual([report.links.dashboard, report.links.report]);
  });
});

describe("formatCombinedDailyPulseMessage", () => {
  it("combines control and Variant B into one message with loop-to-date totals", () => {
    const base = {
      ...report,
      health: "succeeded",
      portfolio: {
        totalRuns: 8,
        daysRunning: 4,
        startedAt: "2026-08-29T08:00:00.000Z",
        runStatuses: { running: 0, succeeded: 7, partial: 1, failed: 0, queued: 0 },
        totalObservations: 24,
        failedObservations: 1,
        openFindings: 3,
        totalCostUsd: 0.056,
        slackDelivery: { sent: 9, failed: 1, queued: 0, processing: 0 },
      },
      comparison: { key: "seo-vs-aeo:daily:2026-08-29", role: "control" as const },
    };
    const variant = { ...base, runId: "run-variant", eventId: "daily-pulse:run-variant", comparison: { ...base.comparison, role: "variant" as const } };

    const { text, blocks } = formatCombinedDailyPulseMessage([base, variant]);
    const flat = JSON.stringify(blocks);

    expect(text).toContain("control + Variant B");
    expect(flat).toContain("CONTROL");
    expect(flat).toContain("VARIANT B");
    expect(flat).toContain("8 total");
    expect(flat).toContain("4 days");
    expect(flat).toContain("24 observations");
    expect(flat).toContain("1 failed delivery");
    expect(flat).toContain("Open control report");
    expect(flat).toContain("Open Variant B report");
  });
});

describe("formatFindingAlertText", () => {
  it("is a short single line carrying the priority and a dashboard link", () => {
    const text = formatFindingAlertText({ title: "Improve answer-page evidence", priority: "high", dashboardPath: "/findings/finding-1", siteOrigin: "https://aeo-loop.vercel.app/" });
    expect(text).toBe("🔍 finding [high] — Improve answer-page evidence. <https://aeo-loop.vercel.app/findings/finding-1|View finding>");
  });
});

describe("postSlackMessage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the message ts on a Slack-reported success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, json: async () => ({ ok: true, ts: "123.456" }) }));
    const result = await postSlackMessage({ token: "xoxb-test", channel: "#aeo-growth-loop", text: "hi" });
    expect(result).toEqual({ ok: true, ts: "123.456" });
  });

  it("surfaces Slack's own error code without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, json: async () => ({ ok: false, error: "channel_not_found" }) }));
    const result = await postSlackMessage({ token: "xoxb-test", channel: "#missing", text: "hi" });
    expect(result).toEqual({ ok: false, error: "channel_not_found" });
  });

  it("turns a network failure into a failed result instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fetch failed")));
    const result = await postSlackMessage({ token: "xoxb-test", channel: "#aeo-growth-loop", text: "hi" });
    expect(result).toEqual({ ok: false, error: "fetch failed" });
  });
});

describe("checkSlackAuth", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reports the bot/team a valid token resolves to", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, json: async () => ({ ok: true, team: "Mantle Studios", user: "pulse" }) }));
    const result = await checkSlackAuth("xoxb-test");
    expect(result).toEqual({ ok: true, team: "Mantle Studios", user: "pulse" });
  });

  it("surfaces Slack's own error code for a bad token without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, json: async () => ({ ok: false, error: "invalid_auth" }) }));
    const result = await checkSlackAuth("xoxb-bad");
    expect(result).toEqual({ ok: false, error: "invalid_auth" });
  });
});
