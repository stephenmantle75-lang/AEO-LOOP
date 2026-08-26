import type { FindingRow, ObservationRow, RunRow } from "./observatory";

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
  schemaVersion: "daily-pulse.v1";
  eventId: string;
  reportType: "daily_pulse";
  runId: string;
  health: string;
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
};

function sevenDaysBefore(value: string): string {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() - 7);
  return date.toISOString();
}

function latestObservation(observations: ObservationRow[]): ObservationRow | undefined {
  return [...observations].sort((a, b) => b.observed_at.localeCompare(a.observed_at))[0];
}

export function buildDailyPulseReport({
  run,
  observations,
  findings,
  dashboardOrigin = "",
}: {
  run: RunRow;
  observations: ObservationRow[];
  findings: FindingRow[];
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
  const dashboardPath = dashboardOrigin.replace(/\/$/, "");
  const openFindings = findings.filter((finding) => finding.status === "new");

  return {
    schemaVersion: "daily-pulse.v1",
    eventId: `daily-pulse:${run.id}`,
    reportType: "daily_pulse",
    runId: run.id,
    health: run.status,
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
  };
}
