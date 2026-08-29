import { describe, expect, it } from "vitest";
import { buildDailyPulseReport, buildTopicRunSnapshots } from "../src/lib/reporting";
import { toReportPayload } from "../src/lib/reporting-persistence";
import { buildDraftFindings } from "../src/lib/analysis";
import type { FindingRow, ObservationRow, RunRow } from "../src/lib/observatory";

const run: RunRow = {
  id: "run-1",
  run_key: "daily-observation:2026-08-27",
  run_type: "daily_observation",
  status: "partial",
  started_at: "2026-08-27T08:00:00.000Z",
  created_at: "2026-08-27T08:00:00.000Z",
  completed_at: "2026-08-27T08:00:10.000Z",
  duration_ms: 10000,
  cost_usd: 0.007,
  sources: ["firecrawl", "exa"],
  agent_version: null,
  metadata: {},
  error_message: null,
};

const observation = (overrides: Partial<ObservationRow>): ObservationRow => ({
  id: "observation-1",
  run_id: run.id,
  topic_key: "seo-vs-aeo-portfolio",
  provider: "exa",
  observation_type: "citation_check",
  status: "observed",
  question: "What is the difference between SEO and AEO for a personal portfolio?",
  target_url: "https://example.com/answer",
  answer_text: null,
  mentioned: false,
  citation_found: false,
  citation_urls: [],
  citations: [],
  metrics: {},
  source_url: null,
  confidence: 0.8,
  error_message: null,
  observed_at: "2026-08-27T08:00:09.000Z",
  created_at: "2026-08-27T08:00:09.000Z",
  ...overrides,
});

const finding = (overrides: Partial<FindingRow>): FindingRow => ({
  id: "finding-1",
  run_id: run.id,
  topic_key: "seo-vs-aeo-portfolio",
  kind: "citation_gap",
  title: "Improve answer-page evidence",
  summary: "The page needs stronger evidence.",
  recommendation: "Review the answer page.",
  priority: "medium",
  status: "new",
  evidence_ids: [],
  expected_impact: null,
  confidence: 0.7,
  linear_issue_url: null,
  slack_delivery_status: null,
  created_at: "2026-08-27T08:00:10.000Z",
  ...overrides,
});

describe("daily pulse report", () => {
  it("derives citation rate with a denominator and keeps later stages unavailable", () => {
    const report = buildDailyPulseReport({
      run,
      observations: [
        observation({ id: "cited", citation_found: true, mentioned: true }),
        observation({ id: "not-cited" }),
      ],
      findings: [finding({})],
    });

    expect(report.schemaVersion).toBe("daily-pulse.v1");
    expect(report.kpis[0]).toMatchObject({ displayValue: "1/2", denominator: 2, delta: null, status: "observed" });
    expect(report.funnel.stages).toEqual([
      { key: "prompt_checks", label: "Prompt checks", value: 2, status: "observed" },
      { key: "cited", label: "Cited", value: 1, status: "observed" },
      { key: "clicked", label: "Clicked", value: null, status: "not_connected" },
      { key: "engaged", label: "Engaged", value: null, status: "not_connected" },
    ]);
    expect(report.actions).toHaveLength(1);
  });

  it("does not invent a citation rate when the provider produced no observed checks", () => {
    const report = buildDailyPulseReport({
      run,
      observations: [observation({ status: "failed", error_message: "provider detail must not enter the report" })],
      findings: [],
      dashboardOrigin: "https://aeo-loop.vercel.app/",
    });

    expect(report.kpis[0]).toMatchObject({ value: null, displayValue: "—", denominator: null, status: "not_measurable" });
    expect(report.funnel.biggestLeak).toMatchObject({ from: "prompt_checks", to: "cited", status: "not_measurable" });
    expect(report.links.report).toBe("https://aeo-loop.vercel.app/reports/run-1");
    expect(JSON.stringify(report)).not.toContain("provider detail");
  });
  it("keeps the persistence payload inside the versioned report contract", () => {
    const report = buildDailyPulseReport({ run, observations: [observation({})], findings: [] });
    const payload = toReportPayload(report);

    expect(payload).toEqual(report);
    expect(Object.keys(payload).sort()).toEqual([
      "actions",
      "eventId",
      "funnel",
      "health",
      "insights",
      "kpis",
      "links",
      "providerHealth",
      "reportType",
      "runId",
      "schemaVersion",
      "window",
    ].sort());
  });
});

describe("topic run history", () => {
  it("groups observations by run and preserves citation denominators", () => {
    const snapshots = buildTopicRunSnapshots([
      observation({ run_id: "older", observed_at: "2026-08-26T08:00:00.000Z", citation_found: true }),
      observation({ run_id: "older", observed_at: "2026-08-26T08:00:01.000Z", id: "older-2" }),
      observation({ run_id: "newer", observed_at: "2026-08-27T08:00:00.000Z", citation_found: false }),
    ]);

    expect(snapshots).toEqual([
      expect.objectContaining({ runId: "newer", observedChecks: 1, citedChecks: 0, citationRate: 0 }),
      expect.objectContaining({ runId: "older", observedChecks: 2, citedChecks: 1, citationRate: 0.5 }),
    ]);
  });
});

describe("draft analysis", () => {
  it("links a citation gap back to the observed evidence without persisting it", () => {
    const drafts = buildDraftFindings({
      run,
      observations: [
        observation({ id: "uncited", citation_found: false }),
        observation({ id: "cited", citation_found: true, mentioned: true }),
      ],
    });

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({ kind: "citation_gap", status: "draft", evidenceIds: ["uncited"] });
    expect(drafts[0].recommendation).toContain("separately deployed answer-page variant");
  });

  it("prioritizes a target integrity failure and does not invent a citation gap", () => {
    const drafts = buildDraftFindings({
      run,
      observations: [
        observation({ id: "page-failure", provider: "firecrawl", observation_type: "page_fetch", status: "failed", error_message: "not inspectable" }),
        observation({ id: "exa-failure", status: "failed" }),
      ],
    });

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({ kind: "technical", priority: "high", evidenceIds: ["page-failure"] });
  });
});
