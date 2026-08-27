import type { SupabaseClient } from "@supabase/supabase-js";
import { seoVsAeoTopic, type TopicDefinition } from "./topic";
import { dashboardClient } from "./supabase";

export type RunRow = {
  id: string;
  run_key: string;
  run_type: string;
  status: string;
  started_at: string;
  created_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  cost_usd: number | string | null;
  sources: string[];
  agent_version: string | null;
  metadata: Record<string, unknown>;
  error_message: string | null;
};

export type FindingRow = {
  id: string;
  run_id: string;
  topic_key: string;
  kind: string;
  title: string;
  summary: string;
  recommendation: string;
  priority: string;
  status: string;
  evidence_ids: string[];
  expected_impact: string | null;
  confidence: number | null;
  linear_issue_url: string | null;
  slack_delivery_status: string | null;
  created_at: string;
};

export type CitationRow = {
  url: string;
  title?: string;
  position?: number;
  snippet?: string;
};

export type ObservationRow = {
  id: string;
  run_id: string;
  topic_key: string;
  provider: string;
  observation_type: string;
  status: string;
  question: string;
  target_url: string | null;
  answer_text: string | null;
  mentioned: boolean;
  citation_found: boolean;
  citation_urls: string[];
  citations: CitationRow[];
  metrics: Record<string, unknown>;
  source_url: string | null;
  confidence: number | null;
  error_message: string | null;
  observed_at: string;
  created_at: string;
};

export type TopicSummary = {
  key: string;
  question: string;
  targetUrl: string;
  promptCount: number;
  observationCount: number;
  observedCount: number;
  failedCount: number;
  citationChecks: number;
  citationsFound: number;
  lastObservedAt: string | null;
};

export type ObservatoryResult<T> = { connected: true; data: T } | { connected: false; data: T };

export const knownTopics: TopicDefinition[] = [seoVsAeoTopic];

const runSelect = "id, run_key, run_type, status, started_at, created_at, completed_at, duration_ms, cost_usd, sources, agent_version, metadata, error_message";
const findingSelect = "id, run_id, topic_key, kind, title, summary, recommendation, priority, status, evidence_ids, expected_impact, confidence, linear_issue_url, slack_delivery_status, created_at";
const observationSelect = "id, run_id, topic_key, provider, observation_type, status, question, target_url, answer_text, mentioned, citation_found, citation_urls, citations, metrics, source_url, confidence, error_message, observed_at, created_at";

export function topicDefinition(key: string): TopicDefinition {
  const known = knownTopics.find((topic) => topic.key === key);
  return known ?? { key, question: key.replaceAll("-", " "), targetUrl: process.env.AEO_TARGET_URL ?? "", prompts: [] };
}

export function topicTitle(key: string): string {
  return topicDefinition(key).question;
}

export function formatDate(value: string | null, includeSeconds = false): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
  }).format(new Date(value));
}

export function formatDuration(milliseconds: number | null): string {
  if (milliseconds === null) return "—";
  if (milliseconds < 1000) return `${milliseconds}ms`;
  return `${(milliseconds / 1000).toFixed(1)}s`;
}

export function formatCost(value: number | string | null): string {
  if (value === null || value === undefined) return "—";
  return `$${Number(value).toFixed(3)}`;
}

export function displayUrl(value: string | null): string {
  if (!value) return "Not recorded";
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function providerLabel(value: string): string {
  return value === "firecrawl" ? "Firecrawl" : value === "exa" ? "Exa" : value === "google_search_console" ? "Search Console" : value;
}

export function observationLabel(value: string): string {
  return value === "page_fetch" ? "Page integrity" : value === "citation_check" ? "Citation check" : value.replaceAll("_", " ");
}

export function runLabel(value: string): string {
  return value.replace("daily-observation:", "Daily observation · ");
}

export function citationRate(observations: ObservationRow[]): number | null {
  const checks = observations.filter((observation) => observation.provider === "exa" && observation.status === "observed");
  if (!checks.length) return null;
  return Math.round((checks.filter((observation) => observation.citation_found).length / checks.length) * 100);
}

export function statusLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function configuredResult<T>(client: SupabaseClient | null, data: T): ObservatoryResult<T> {
  return { connected: Boolean(client), data };
}

export async function getRuns(limit = 50): Promise<ObservatoryResult<RunRow[]>> {
  const client = dashboardClient();
  if (!client) return configuredResult(client, []);
  const { data, error } = await client.from("runs").select(runSelect).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`Runs could not be loaded from Supabase: ${error.message}`);
  return configuredResult(client, (data ?? []) as RunRow[]);
}

export async function getRunDetail(id: string): Promise<ObservatoryResult<{ run: RunRow | null; observations: ObservationRow[]; findings: FindingRow[] }>> {
  const client = dashboardClient();
  const empty = { run: null, observations: [], findings: [] };
  if (!client) return configuredResult(client, empty);

  const [runResult, observationsResult, findingsResult] = await Promise.all([
    client.from("runs").select(runSelect).eq("id", id).maybeSingle(),
    client.from("observations").select(observationSelect).eq("run_id", id).order("created_at", { ascending: true }),
    client.from("findings").select(findingSelect).eq("run_id", id).order("created_at", { ascending: true }),
  ]);
  if (runResult.error) throw new Error(`Run could not be loaded from Supabase: ${runResult.error.message}`);
  if (observationsResult.error) throw new Error(`Run evidence could not be loaded from Supabase: ${observationsResult.error.message}`);
  if (findingsResult.error) throw new Error(`Run findings could not be loaded from Supabase: ${findingsResult.error.message}`);
  return configuredResult(client, {
    run: (runResult.data as RunRow | null) ?? null,
    observations: (observationsResult.data ?? []) as ObservationRow[],
    findings: (findingsResult.data ?? []) as FindingRow[],
  });
}

export async function getTopicObservations(key: string, limit = 100): Promise<ObservatoryResult<ObservationRow[]>> {
  const client = dashboardClient();
  if (!client) return configuredResult(client, []);
  const { data, error } = await client.from("observations").select(observationSelect).eq("topic_key", key).order("observed_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`Topic evidence could not be loaded from Supabase: ${error.message}`);
  return configuredResult(client, (data ?? []) as ObservationRow[]);
}

export async function getTopicSummaries(): Promise<ObservatoryResult<TopicSummary[]>> {
  const client = dashboardClient();
  if (!client) return configuredResult(client, []);
  const { data, error } = await client.from("observations").select("topic_key, provider, status, citation_found, observed_at").order("observed_at", { ascending: false }).limit(500);
  if (error) throw new Error(`Topic summaries could not be loaded from Supabase: ${error.message}`);

  const grouped = new Map<string, Array<{ provider: string; status: string; citation_found: boolean; observed_at: string }>>();
  for (const row of data ?? []) {
    const topicRows = grouped.get(row.topic_key) ?? [];
    topicRows.push(row);
    grouped.set(row.topic_key, topicRows);
  }
  const keys = [...new Set([...knownTopics.map((topic) => topic.key), ...grouped.keys()])];
  return configuredResult(client, keys.map((key) => {
    const topic = topicDefinition(key);
    const rows = grouped.get(key) ?? [];
    const citationChecks = rows.filter((row) => row.provider === "exa" && row.status === "observed");
    return {
      key,
      question: topic.question,
      targetUrl: topic.targetUrl,
      promptCount: topic.prompts.length,
      observationCount: rows.length,
      observedCount: rows.filter((row) => row.status === "observed").length,
      failedCount: rows.filter((row) => row.status === "failed").length,
      citationChecks: citationChecks.length,
      citationsFound: citationChecks.filter((row) => row.citation_found).length,
      lastObservedAt: rows[0]?.observed_at ?? null,
    };
  }));
}

export async function getFindingCount(): Promise<number> {
  const client = dashboardClient();
  if (!client) return 0;
  const { count, error } = await client.from("findings").select("id", { count: "exact", head: true }).eq("status", "new");
  if (error) throw new Error(`Findings could not be counted from Supabase: ${error.message}`);
  return count ?? 0;
}

export async function getFindings(limit = 100): Promise<ObservatoryResult<FindingRow[]>> {
  const client = dashboardClient();
  if (!client) return configuredResult(client, []);
  const { data, error } = await client
    .from("findings")
    .select(findingSelect)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Findings could not be loaded from Supabase: ${error.message}`);
  return configuredResult(client, (data ?? []) as FindingRow[]);
}

export async function getFindingDetail(id: string): Promise<ObservatoryResult<{ finding: FindingRow | null; run: RunRow | null; observations: ObservationRow[] }>> {
  const client = dashboardClient();
  const empty = { finding: null, run: null, observations: [] };
  if (!client) return configuredResult(client, empty);

  const findingResult = await client.from("findings").select(findingSelect).eq("id", id).maybeSingle();
  if (findingResult.error) throw new Error(`Finding could not be loaded from Supabase: ${findingResult.error.message}`);
  const finding = (findingResult.data as FindingRow | null) ?? null;
  if (!finding) return configuredResult(client, empty);

  const runResult = await getRunDetail(finding.run_id);
  return configuredResult(client, {
    finding,
    run: runResult.data.run,
    observations: runResult.data.observations.filter((observation) => finding.evidence_ids.includes(observation.id)),
  });
}

export async function getOverviewData(): Promise<ObservatoryResult<{ runs: RunRow[]; findings: FindingRow[]; observationCount: number; latestObservations: ObservationRow[] }>> {
  const client = dashboardClient();
  const empty = { runs: [], findings: [], observationCount: 0, latestObservations: [] };
  if (!client) return configuredResult(client, empty);
  const [runsResult, findingsResult, observationsResult] = await Promise.all([
    client.from("runs").select(runSelect).order("created_at", { ascending: false }).limit(8),
    client.from("findings").select(findingSelect).order("created_at", { ascending: false }).limit(5),
    client.from("observations").select("id", { count: "exact", head: true }),
  ]);
  if (runsResult.error) throw new Error(`Runs could not be loaded from Supabase: ${runsResult.error.message}`);
  if (findingsResult.error) throw new Error(`Findings could not be loaded from Supabase: ${findingsResult.error.message}`);
  if (observationsResult.error) throw new Error(`Observations could not be counted from Supabase: ${observationsResult.error.message}`);
  const runs = (runsResult.data ?? []) as RunRow[];
  const latestRun = runs[0];
  let latestObservations: ObservationRow[] = [];
  if (latestRun) {
    const latestResult = await client.from("observations").select(observationSelect).eq("run_id", latestRun.id).order("created_at", { ascending: true });
    if (latestResult.error) throw new Error(`Latest evidence could not be loaded from Supabase: ${latestResult.error.message}`);
    latestObservations = (latestResult.data ?? []) as ObservationRow[];
  }
  return configuredResult(client, { runs, findings: (findingsResult.data ?? []) as FindingRow[], observationCount: observationsResult.count ?? 0, latestObservations });
}
