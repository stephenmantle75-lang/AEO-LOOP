import { dashboardClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type RunRow = {
  id: string;
  run_key: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  cost_usd: number | string | null;
  sources: string[];
};

type FindingRow = { id: string; title: string; priority: string; status: string };

type ObservationRow = {
  id: string;
  provider: string;
  observation_type: string;
  status: string;
  question: string;
  target_url: string | null;
  mentioned: boolean;
  citation_found: boolean;
  citation_urls: string[];
  metrics: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
};

type DashboardData = {
  connected: boolean;
  runs: RunRow[];
  findings: FindingRow[];
  observations: number;
  latestObservations: ObservationRow[];
};

async function dashboardData(): Promise<DashboardData> {
  const client = dashboardClient();
  if (!client) return { connected: false, runs: [], findings: [], observations: 0, latestObservations: [] };

  const [runs, findings, observations] = await Promise.all([
    client.from("runs").select("id, run_key, status, created_at, completed_at, duration_ms, cost_usd, sources").order("created_at", { ascending: false }).limit(8),
    client.from("findings").select("id, title, priority, status").order("created_at", { ascending: false }).limit(5),
    client.from("observations").select("id", { count: "exact", head: true }),
  ]);

  if (runs.error || findings.error || observations.error) throw new Error("Dashboard data could not be loaded from Supabase");

  const runRows = (runs.data ?? []) as RunRow[];
  const latestRun = runRows[0];
  const latest = latestRun
    ? await client.from("observations").select("id, provider, observation_type, status, question, target_url, mentioned, citation_found, citation_urls, metrics, error_message, created_at").eq("run_id", latestRun.id).order("created_at", { ascending: true })
    : { data: [], error: null };

  if (latest.error) throw new Error("Latest evidence could not be loaded from Supabase");

  return {
    connected: true,
    runs: runRows,
    findings: (findings.data ?? []) as FindingRow[],
    observations: observations.count ?? 0,
    latestObservations: (latest.data ?? []) as ObservationRow[],
  };
}

function date(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function runLabel(value: string) {
  return value.replace("daily-observation:", "Daily observation · ");
}

function providerLabel(value: string) {
  return value === "firecrawl" ? "Firecrawl" : value === "exa" ? "Exa" : value;
}

function observationLabel(value: string) {
  return value === "page_fetch" ? "Page integrity" : value === "citation_check" ? "Citation check" : value;
}

function displayUrl(value: string | null) {
  if (!value) return "No target recorded";
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function citationRate(observations: ObservationRow[]) {
  const checks = observations.filter((observation) => observation.provider === "exa" && observation.status === "observed");
  if (!checks.length) return null;
  return Math.round((checks.filter((observation) => observation.citation_found).length / checks.length) * 100);
}

function providerState(observations: ObservationRow[], provider: string) {
  const observation = observations.find((item) => item.provider === provider);
  return observation?.status ?? "not-run";
}

export default async function ObservatoryPage() {
  const data = await dashboardData();
  const latest = data.runs[0];
  const rate = citationRate(data.latestObservations);
  const openFindings = data.findings.filter((finding) => finding.status === "new").length;
  const cost = latest?.cost_usd === null || latest?.cost_usd === undefined ? "—" : `$${Number(latest.cost_usd).toFixed(3)}`;

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">A</span><span>AEO LOOP</span></div>
      <div className="nav-label">Observe</div>
      <div className="nav-item active"><span>Overview</span><span className="nav-count">Live</span></div>
      <div className="nav-item"><span>Topics</span><span className="nav-count">1</span></div>
      <div className="nav-item"><span>Runs</span></div>
      <div className="nav-label">Act</div>
      <div className="nav-item"><span>Findings</span><span className="nav-count">{openFindings}</span></div>
      <div className="nav-item"><span>Experiments</span></div>
      <div className="nav-label">System</div>
      <div className="nav-item"><span>Integrations</span></div>
      <div className="nav-item"><span>Architecture</span></div>
    </aside>

    <main className="main">
      <div className="topbar">
        <div><div className="eyebrow">Observatory / Overview</div><h1>Good morning, Stephen.</h1><p className="subhead">A live review of what the AEO loop observed, learned, and is ready to review.</p></div>
        <span className={`status-pill ${data.connected ? "connected" : "disconnected"}`}>{data.connected ? "● Database connected" : "○ Setup required"}</span>
      </div>

      <section className="cards" aria-label="Key metrics">
        <div className="card"><div className="card-label">Latest run</div><div className={`metric metric-status ${latest?.status ?? "empty"}`}>{latest?.status ?? "—"}</div><div className="metric-note">{latest ? date(latest.created_at) : "No run recorded"}</div></div>
        <div className="card"><div className="card-label">Citation rate</div><div className="metric">{rate === null ? "—" : `${rate}%`}</div><div className="metric-note">{rate === null ? "awaiting Exa evidence" : `${data.latestObservations.filter((item) => item.provider === "exa" && item.status === "observed" && item.citation_found).length} cited checks in latest run`}</div></div>
        <div className="card"><div className="card-label">Evidence captured</div><div className="metric">{data.observations}</div><div className="metric-note">observations stored in Supabase</div></div>
        <div className="card"><div className="card-label">Open findings</div><div className="metric">{openFindings}</div><div className="metric-note">human review required</div></div>
      </section>

      {!data.connected && <div className="notice">The dashboard is showing setup state. Add the server-only Supabase variables to load real runs; no sample evidence is being presented.</div>}

      <section className="content-grid">
        <div className="panel panel-pad">
          <div className="panel-head panel-head-tight"><span className="panel-title">Latest observation run</span><span className={`run-status ${latest?.status ?? "empty"}`}><span className={`dot ${latest?.status ?? "empty"}`} />{latest?.status ?? "not started"}</span></div>
          {latest ? <>
            <div className="run-key">{runLabel(latest.run_key)}</div>
            <div className="run-meta"><span>Started {date(latest.created_at)}</span><span>{latest.duration_ms ? `${(latest.duration_ms / 1000).toFixed(1)}s` : "Duration unavailable"}</span><span>{cost} provider cost</span></div>
            <div className="source-chips">{latest.sources.map((source) => <span className="source-chip" key={source}>{providerLabel(source)}</span>)}</div>
          </> : <div className="empty"><strong>No observation runs yet</strong>The first protected daily run will appear here after the cron route writes evidence.</div>}
        </div>

        <div className="panel panel-pad">
          <div className="panel-head panel-head-tight"><span className="panel-title">Provider health</span><span className="panel-meta">latest run</span></div>
          <div className="provider-list">
            {["firecrawl", "exa"].map((provider) => { const state = providerState(data.latestObservations, provider); return <div className="provider-row" key={provider}><div><strong>{providerLabel(provider)}</strong><span>{provider === "firecrawl" ? "target page integrity" : "synthetic citation check"}</span></div><span className={`provider-state ${state}`}><span className={`dot ${state}`} />{state.replace("-", " ")}</span></div>; })}
          </div>
        </div>
      </section>

      <section className="panel evidence-panel">
        <div className="panel-head"><span className="panel-title">Latest evidence</span><span className="panel-meta">{latest ? `${data.latestObservations.length} records from Supabase` : "no records"}</span></div>
        {data.latestObservations.length ? <div className="table-wrap"><table><thead><tr><th>Provider</th><th>Check</th><th>Status</th><th>Target</th><th>Result</th></tr></thead><tbody>{data.latestObservations.map((observation) => <tr key={observation.id}><td><strong>{providerLabel(observation.provider)}</strong></td><td>{observationLabel(observation.observation_type)}<small>{observation.question}</small></td><td><span className="run-status"><span className={`dot ${observation.status}`} />{observation.status}</span></td><td className="target-cell">{displayUrl(observation.target_url)}</td><td>{observation.status === "failed" ? <span className="result-error">{observation.error_message ?? "Provider failed"}</span> : observation.provider === "exa" ? <span className={observation.citation_found ? "result-positive" : "result-muted"}>{observation.citation_found ? "Citation found" : "No citation found"}</span> : <span className="result-positive">Document inspected</span>}</td></tr>)}</tbody></table></div> : <div className="empty"><strong>No evidence for the latest run</strong>Evidence rows will appear here after a real provider collection completes.</div>}
      </section>

      <section className="panel architecture">
        <div className="panel-title">How this screen gets its evidence</div>
        <div className="flow"><div className="flow-step">Vercel Cron<br /><small>daily trigger</small></div><div className="arrow">→</div><div className="flow-step">Firecrawl + Exa<br /><small>collectors</small></div><div className="arrow">→</div><div className="flow-step">Supabase<br /><small>runs + observations</small></div><div className="arrow">→</div><div className="flow-step">Observatory<br /><small>review surface</small></div></div>
        <div className="notice">This is a database-backed review surface. Numbers are read from Supabase, and provider failures remain visible instead of being converted into zeros.</div>
      </section>
    </main>
  </div>;
}
