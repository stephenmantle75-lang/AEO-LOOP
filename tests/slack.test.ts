import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDailyPulseMessage, formatFindingAlertText, postSlackMessage } from "../src/lib/slack";
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
