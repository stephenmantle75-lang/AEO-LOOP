import type { FindingRow, ObservationRow, RunRow } from "./observatory";
import { canonicalAeoHost } from "./topic";

export type ReportStage = {
  key: string;
  label: string;
  value: number | null;
  status: "observed" | "not_connected" | "not_measurable";
};

export type ReportKpi = {
  key: string;
  label: string;
  value: number | null;
  displayValue: string;
  delta: number | null;
  unit: "rate" | "count" | "currency";
  denominator: number | null;
  source: string;
  freshness: string | null;
  status: "observed" | "not_connected" | "not_measurable";
};

export type DailyPulseReport = {
  schemaVersion: "daily-pulse.v1" | "daily-pulse.v2";
  eventId: string;
  reportType: "daily_pulse";
  runId: string;
  health: string;
  comparison?: {
    key: string;
    role: "control" | "variant";
  };
  window: {
    start: string;
    end: string;
    comparison: "previous_7_complete_days";
  };
  kpis: ReportKpi[];
  funnel: {
    stages: ReportStage[];
    biggestLeak: {
      from: string;
      to: string;
      status: "measurable" | "not_measurable";
    };
  };
  providerHealth: Array<{ provider: string; status: string; freshness: string | null }>;
  insights: Array<{ title: string; status: string }>;
  actions: Array<{ title: string; status: string; priority: string }>;
  links: { dashboard: string; run: string; report: string };
  measurement?: {
    targetUrl: string | null;
    targetHost: string | null;
    targetIsCanonical: boolean;
    observedPromptChecks: number;
    expectedPromptChecks: number | null;
  };
  portfolio?: PortfolioStats;
};

export type PortfolioStats = {
  totalRuns: number;
  daysRunning: number | null;
  startedAt: string | null;
  runStatuses: { running: number; succeeded: number; partial: number; failed: number; queued: number };
  totalObservations: number;
  failedObservations: number;
  openFindings: number;
  totalCostUsd: number;
  slackDelivery: { sent: number; failed: number; queued: number; processing: number };
};

export type PortfolioRunSummary = Pick<RunRow, "status" | "started_at" | "cost_usd">;
export type PortfolioObservationSummary = Pick<ObservationRow, "status">;
export type PortfolioOutboxSummary = { status: string };
export type PortfolioFindingDeliverySummary = { channel: string; status: string };

function daysBetweenInclusive(start: string | null, end: string): number | null {
  if (!start) return null;
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  return Math.max(1, Math.floor((endMs - startMs) / 86_400_000) + 1);
}

export function buildPortfolioStats({
  runs,
  observations,
  findings,
  reportOutbox,
  findingDeliveries,
  asOf,
}: {
  runs: PortfolioRunSummary[];
  observations: PortfolioObservationSummary[];
  findings: FindingRow[];
  reportOutbox: PortfolioOutboxSummary[];
  findingDeliveries: PortfolioFindingDeliverySummary[];
  asOf: string;
}): PortfolioStats {
  const startedAt = runs.map((run) => run.started_at).filter(Boolean).sort()[0] ?? null;
  const runStatuses = { running: 0, succeeded: 0, partial: 0, failed: 0, queued: 0 };
  for (const run of runs) {
    if (run.status in runStatuses) runStatuses[run.status as keyof typeof runStatuses] += 1;
  }

  const slackStatuses = [...reportOutbox, ...findingDeliveries.filter((delivery) => delivery.channel === "slack")].reduce(
    (summary, row) => {
      if (row.status === "sent") summary.sent += 1;
      if (row.status === "failed") summary.failed += 1;
      if (row.status === "queued") summary.queued += 1;
      if (row.status === "processing") summary.processing += 1;
      return summary;
    },
    { sent: 0, failed: 0, queued: 0, processing: 0 },
  );

  return {
    totalRuns: runs.length,
    daysRunning: daysBetweenInclusive(startedAt, asOf),
    startedAt,
    runStatuses,
    totalObservations: observations.length,
    failedObservations: observations.filter((observation) => observation.status === "failed").length,
    openFindings: findings.filter((finding) => ["new", "approved", "in_progress"].includes(finding.status)).length,
    totalCostUsd: runs.reduce((total, run) => {
      const cost = Number(run.cost_usd);
      return Number.isFinite(cost) && cost >= 0 ? total + cost : total;
    }, 0),
    slackDelivery: slackStatuses,
  };
}

export type TopicRunSnapshot = {
  runId: string;
  observedAt: string | null;
  observedChecks: number;
  citedChecks: number;
  citationRate: number | null;
  failedObservations: number;
};

export function buildTopicRunSnapshots(observations: ObservationRow[]): TopicRunSnapshot[] {
  const byRun = new Map<string, ObservationRow[]>();
  for (const observation of observations) {
    const rows = byRun.get(observation.run_id) ?? [];
    rows.push(observation);
    byRun.set(observation.run_id, rows);
  }

  return [...byRun.entries()]
    .map(([runId, rows]) => {
      const checks = rows.filter(
        (observation) => observation.provider === "exa" && observation.observation_type === "citation_check" && observation.status === "observed",
      );
      const citedChecks = checks.filter((observation) => observation.citation_found).length;
      const latest = [...rows].sort((a, b) => b.observed_at.localeCompare(a.observed_at))[0];
      return {
        runId,
        observedAt: latest?.observed_at ?? null,
        observedChecks: checks.length,
        citedChecks,
        citationRate: checks.length ? citedChecks / checks.length : null,
        failedObservations: rows.filter((observation) => observation.status === "failed").length,
      };
    })
    .sort((a, b) => (b.observedAt ?? "").localeCompare(a.observedAt ?? ""));
}

function sevenDaysBefore(value: string): string {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() - 7);
  return date.toISOString();
}

function latestObservation(observations: ObservationRow[]): ObservationRow | undefined {
  return [...observations].sort((a, b) => b.observed_at.localeCompare(a.observed_at))[0];
}

function targetHost(targetUrl: string | null): string | null {
  if (!targetUrl) return null;
  try {
    return new URL(targetUrl).hostname;
  } catch {
    return null;
  }
}

export function buildDailyPulseReport({
  run,
  observations,
  findings,
  portfolio,
  dashboardOrigin = "",
}: {
  run: RunRow;
  observations: ObservationRow[];
  findings: FindingRow[];
  portfolio?: PortfolioStats;
  dashboardOrigin?: string;
}): DailyPulseReport {
  const exaChecks = observations.filter(
    (observation) => observation.provider === "exa" && observation.observation_type === "citation_check",
  );
  const observedChecks = exaChecks.filter((observation) => observation.status === "observed");
  const citedChecks = observedChecks.filter((observation) => observation.citation_found);
  const latest = latestObservation(observations);
  const citationRate = observedChecks.length ? citedChecks.length / observedChecks.length : null;
  const targetPage = observations.find((observation) => observation.provider === "firecrawl");
  const measuredTargetUrl = targetPage?.target_url ?? exaChecks[0]?.target_url ?? null;
  const measuredTargetHost = targetHost(measuredTargetUrl);
  const expectedPromptChecks = typeof run.metadata?.promptLimit === "number" ? run.metadata.promptLimit : null;
  const dashboardPath = dashboardOrigin.replace(/\/$/, "");
  const openFindings = findings.filter((finding) => finding.status === "new");

  const comparisonKey = typeof run.metadata?.comparisonKey === "string" ? run.metadata.comparisonKey : null;
  const comparisonRole = run.metadata?.comparisonRole === "control" || run.metadata?.comparisonRole === "variant" ? run.metadata.comparisonRole : null;

  return {
    schemaVersion: "daily-pulse.v2",
    eventId: `daily-pulse:${run.id}`,
    reportType: "daily_pulse",
    runId: run.id,
    health: run.status,
    ...(comparisonKey && comparisonRole ? { comparison: { key: comparisonKey, role: comparisonRole } } : {}),
    window: {
      start: sevenDaysBefore(run.started_at),
      end: run.completed_at ?? run.started_at,
      comparison: "previous_7_complete_days",
    },
    kpis: [
      {
        key: "synthetic_citation_rate",
        label: "Citation rate",
        value: citationRate,
        displayValue: citationRate === null ? "—" : `${citedChecks.length}/${observedChecks.length}`,
        delta: null,
        unit: "rate",
        denominator: observedChecks.length || null,
        source: "observations.citation_check",
        freshness: latest?.observed_at ?? null,
        status: citationRate === null ? "not_measurable" : "observed",
      },
      {
        key: "target_page_integrity",
        label: "Target page integrity",
        value: targetPage?.status === "observed" ? 1 : targetPage?.status === "failed" ? 0 : null,
        displayValue: targetPage?.status === "observed" ? "observed" : targetPage?.status === "failed" ? "failed" : "—",
        delta: null,
        unit: "rate",
        denominator: targetPage ? 1 : null,
        source: "observations.page_fetch",
        freshness: targetPage?.observed_at ?? null,
        status: targetPage ? "observed" : "not_measurable",
      },
    ],
    funnel: {
      stages: [
        { key: "prompt_checks", label: "Prompt checks", value: exaChecks.length || null, status: exaChecks.length ? "observed" : "not_measurable" },
        { key: "cited", label: "Cited", value: citedChecks.length || null, status: observedChecks.length ? "observed" : "not_measurable" },
        { key: "clicked", label: "Clicked", value: null, status: "not_connected" },
        { key: "engaged", label: "Engaged", value: null, status: "not_connected" },
      ],
      biggestLeak: {
        from: observedChecks.length ? "cited" : "prompt_checks",
        to: observedChecks.length ? "clicked" : "cited",
        status: observedChecks.length ? "not_measurable" : "not_measurable",
      },
    },
    providerHealth: [...new Set(observations.map((observation) => observation.provider))].map((provider) => {
      const observation = observations
        .filter((item) => item.provider === provider)
        .sort((a, b) => b.observed_at.localeCompare(a.observed_at))[0];
      return { provider, status: observation?.status ?? "not_run", freshness: observation?.observed_at ?? null };
    }),
    insights: [],
    actions: openFindings.map((finding) => ({ title: finding.title, status: finding.status, priority: finding.priority })),
    links: {
      dashboard: dashboardPath || "/",
      run: `${dashboardPath}/runs/${run.id}`,
      report: `${dashboardPath}/reports/${run.id}`,
    },
    measurement: {
      targetUrl: measuredTargetUrl,
      targetHost: measuredTargetHost,
      targetIsCanonical: measuredTargetHost === canonicalAeoHost,
      observedPromptChecks: exaChecks.length,
      expectedPromptChecks,
    },
    ...(portfolio ? { portfolio } : {}),
  };
}
