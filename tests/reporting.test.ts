import { describe, expect, it } from "vitest";
import { buildDailyPulseReport, buildPortfolioStats, buildTopicRunSnapshots } from "../src/lib/reporting";
import { loadReportInputs, toReportPayload } from "../src/lib/reporting-persistence";
import { buildDraftAnalysis, buildDraftFindings, toAnalysisRecordPayload } from "../src/lib/analysis";
import type { FindingRow, ObservationRow, RunRow } from "../src/lib/observatory";

const run: RunRow = {
  id: "run-1",
  run_key: "daily-observation:2026-08-27",
  run_type: "daily_observation",
  status: "partial",
  started_at: "2026-08-27T08:00:00.000Z",
  heartbeat_at: null,
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

    expect(report.schemaVersion).toBe("daily-pulse.v2");
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

  it("deduplicates repeated open findings and exposes their age in the action contract", () => {
    const report = buildDailyPulseReport({
      run: { ...run, started_at: "2026-09-05T08:00:00.000Z", completed_at: "2026-09-05T08:00:10.000Z" },
      observations: [observation({})],
      findings: [
        finding({ id: "older", title: "No target citation in the current prompt checks", created_at: "2026-08-30T08:00:00.000Z" }),
        finding({ id: "duplicate", title: "No target citation in the current prompt checks", created_at: "2026-08-30T08:00:01.000Z" }),
      ],
    });

    expect(report.actions).toEqual([
      expect.objectContaining({
        title: "No target citation in the current prompt checks",
        status: "new",
        priority: "medium",
        findingId: "older",
        ageDays: 6,
        ageLabel: "open 6d",
      }),
    ]);
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

  it("loads open findings across runs so persisted reports match the dashboard work queue", async () => {
    const calls: string[] = [];
    const query = (table: string, result: unknown) => {
      const chain: any = Promise.resolve(result);
      for (const method of ["select", "eq", "order"]) chain[method] = (...args: unknown[]) => {
        if (method === "eq") calls.push(`${table}.${String(args[0])}:${String(args[1])}`);
        return chain;
      };
      chain.single = () => chain;
      return chain;
    };
    const client = {
      from: (table: string) => {
        if (table === "runs") return { select: () => query(table, { data: run, error: null }) };
        if (table === "observations") return { select: () => query(table, { data: [observation({})], error: null }) };
        return { select: () => query(table, { data: [finding({ run_id: "older-run" })], error: null }) };
      },
    };

    const inputs = await loadReportInputs(client as never, run.id);

    expect(inputs.findings).toHaveLength(1);
    expect(inputs.findings[0].run_id).toBe("older-run");
    expect(calls).toContain("runs.id:run-1");
    expect(calls).not.toContain("findings.run_id:run-1");
  });
});

describe("portfolio report totals", () => {
  it("counts all runs, elapsed days, evidence failures, open work, cost, and Slack delivery state", () => {
    const stats = buildPortfolioStats({
      runs: [
        { status: "succeeded", started_at: "2026-08-29T08:00:00.000Z", cost_usd: 0.01 },
        { status: "partial", started_at: "2026-08-30T08:00:00.000Z", cost_usd: "0.02" },
        { status: "failed", started_at: "2026-09-01T08:00:00.000Z", cost_usd: null },
        { status: "running", started_at: "2026-09-02T08:00:00.000Z", cost_usd: 0.03 },
      ],
      observations: [{ status: "observed" }, { status: "failed" }],
      findings: [finding({ status: "new" }), finding({ id: "finding-2", status: "in_progress" }), finding({ id: "finding-3", status: "shipped" })],
      reportOutbox: [{ status: "sent" }, { status: "failed" }, { status: "queued" }],
      findingDeliveries: [{ channel: "slack", status: "sent" }, { channel: "linear", status: "failed" }, { channel: "slack", status: "processing" }],
      asOf: "2026-09-02T08:00:00.000Z",
    });

    expect(stats).toEqual({
      totalRuns: 4,
      daysRunning: 5,
      startedAt: "2026-08-29T08:00:00.000Z",
      runStatuses: { running: 1, succeeded: 1, partial: 1, failed: 1, queued: 0 },
      totalObservations: 2,
      failedObservations: 1,
      openFindings: 2,
      totalCostUsd: 0.06,
      slackDelivery: { sent: 2, failed: 1, queued: 1, processing: 1 },
    });
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

  it("does not recommend creating Variant B again after a variant retest", () => {
    const variantRun: RunRow = {
      ...run,
      id: "variant-run",
      run_type: "experiment_retest",
      metadata: { comparisonKey: "seo-vs-aeo:manual:test", comparisonRole: "variant" },
    };
    const drafts = buildDraftFindings({
      run: variantRun,
      observations: [observation({ run_id: variantRun.id, topic_key: "seo-vs-aeo-portfolio-variant-b", citation_found: false })],
    });

    expect(drafts[0].recommendation).not.toContain("Create a separately deployed answer-page variant");
    expect(drafts[0].recommendation).toContain("authority and discovery gaps");
    expect(drafts[0].recommendation).toContain("paired control");
  });

  it("keeps a paired control frozen until the variant comparison is reviewed", () => {
    const controlRun: RunRow = {
      ...run,
      metadata: { comparisonKey: "seo-vs-aeo:manual:test", comparisonRole: "control" },
    };
    const drafts = buildDraftFindings({
      run: controlRun,
      observations: [observation({ citation_found: false })],
    });

    expect(drafts[0].recommendation).toContain("Keep the control unchanged");
    expect(drafts[0].recommendation).toContain("paired Variant B run");
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

  it("emits stable provenance for a review-only analysis", () => {
    const analysis = buildDraftAnalysis({
      run,
      observations: [observation({ id: "uncited" })],
      analyzedAt: "2026-08-27T08:00:10.000Z",
    });

    expect(analysis.metadata).toEqual({
      analysisId: "draft-analysis:run-1",
      runId: "run-1",
      agentVersion: "deterministic-review-v2",
      model: null,
      promptVersion: "evidence-to-finding.v2",
      costUsd: 0,
      analyzedAt: "2026-08-27T08:00:10.000Z",
      reviewMode: "draft_only",
    });
    expect(analysis.findings.every((draft) => draft.evidenceIds.length > 0)).toBe(true);
  });

  it("creates a deduplicated persistence snapshot without activating writes", () => {
    const analysis = buildDraftAnalysis({
      run,
      observations: [
        observation({ id: "page-failure", provider: "firecrawl", observation_type: "page_fetch", status: "failed" }),
        observation({ id: "uncited", citation_found: false }),
      ],
      analyzedAt: "2026-08-27T08:00:10.000Z",
    });
    const payload = toAnalysisRecordPayload(analysis);

    expect(payload).toMatchObject({
      analysisKey: "draft-analysis:run-1",
      status: "draft",
      reviewMode: "draft_only",
      observationIds: ["page-failure", "uncited"],
    });
    expect(payload.findings.every((draft) => draft.evidenceIds.length > 0)).toBe(true);
  });
});
