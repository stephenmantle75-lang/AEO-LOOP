import { dashboardClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type RunRow = { id: string; run_key: string; status: string; created_at: string; duration_ms: number | null; sources: string[] };
type FindingRow = { id: string; title: string; priority: string; status: string };

async function dashboardData() {
  const client = dashboardClient();
  if (!client) return { connected: false, runs: [] as RunRow[], findings: [] as FindingRow[], observations: 0 };

  const [runs, findings, observations] = await Promise.all([
    client.from("runs").select("id, run_key, status, created_at, duration_ms, sources").order("created_at", { ascending: false }).limit(8),
    client.from("findings").select("id, title, priority, status").order("created_at", { ascending: false }).limit(5),
    client.from("observations").select("id", { count: "exact", head: true }),
  ]);
  if (runs.error || findings.error || observations.error) throw new Error("Dashboard data could not be loaded from Supabase");
  return { connected: true, runs: (runs.data ?? []) as RunRow[], findings: (findings.data ?? []) as FindingRow[], observations: observations.count ?? 0 };
}

function date(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }

export default async function ObservatoryPage() {
  const data = await dashboardData();
  const succeeded = data.runs.filter((run) => run.status === "succeeded").length;
  const latest = data.runs[0];
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">A</span><span>AEO LOOP</span></div>
      <div className="nav-label">Observe</div>
      <div className="nav-item active"><span>Overview</span><span className="nav-count">Live</span></div>
      <div className="nav-item"><span>Topics</span><span className="nav-count">1</span></div>
      <div className="nav-item"><span>Runs</span></div>
      <div className="nav-label">Act</div>
      <div className="nav-item"><span>Findings</span><span className="nav-count">{data.findings.length}</span></div>
      <div className="nav-item"><span>Experiments</span></div>
      <div className="nav-label">System</div>
      <div className="nav-item"><span>Integrations</span></div>
      <div className="nav-item"><span>Architecture</span></div>
    </aside>
    <main className="main">
      <div className="topbar"><div><div className="eyebrow">Observatory / Overview</div><h1>Good morning, Stephen.</h1><p className="subhead">A clear view of what the AEO loop observed, learned, and is ready to review.</p></div><span className="status-pill">{data.connected ? "● Database connected" : "○ Setup required"}</span></div>
      <section className="cards">
        <div className="card"><div className="card-label">Total observations</div><div className="metric">{data.observations}</div><div className="metric-note">stored in Supabase</div></div>
        <div className="card"><div className="card-label">Successful runs</div><div className="metric">{succeeded}</div><div className="metric-note">of {data.runs.length || 0} recorded</div></div>
        <div className="card"><div className="card-label">Citation rate</div><div className="metric">—</div><div className="metric-note">awaiting Exa baseline</div></div>
        <div className="card"><div className="card-label">Open findings</div><div className="metric">{data.findings.filter((finding) => finding.status === "new").length}</div><div className="metric-note">human review required</div></div>
      </section>
      {!data.connected && <div className="notice">The dashboard is intentionally showing setup state. Add the server-only Supabase variables to load real runs; no sample evidence is being presented.</div>}
      <section className="content-grid">
        <div className="panel"><div className="panel-head"><span className="panel-title">Recent observation runs</span><span className="panel-meta">database records</span></div>{data.runs.length ? <div className="table-wrap"><table><thead><tr><th>Run</th><th>Status</th><th>Sources</th><th>Started</th></tr></thead><tbody>{data.runs.map((run) => <tr key={run.id}><td>{run.run_key}</td><td><span className="run-status"><span className={`dot ${run.status}`} />{run.status}</span></td><td>{run.sources?.join(" · ") || "—"}</td><td>{date(run.created_at)}</td></tr>)}</tbody></table></div> : <div className="empty"><strong>No observation runs yet</strong>The first protected daily run will appear here after the cron route is configured and a real collector writes evidence.</div>}</div>
        <div className="panel"><div className="panel-head"><span className="panel-title">Topics being measured</span><span className="panel-meta">1 active</span></div><div className="topic-list"><div className="topic-row"><div><div className="topic-name">SEO vs AEO for portfolios</div><div className="topic-url">/insights/seo-vs-aeo-portfolio</div></div><div className="topic-score">{latest ? "tracking" : "queued"}</div></div></div></div>
      </section>
      <section className="panel architecture"><div className="panel-title">How this screen gets its evidence</div><div className="flow"><div className="flow-step">Vercel Cron<br /><small>daily trigger</small></div><div className="arrow">→</div><div className="flow-step">Firecrawl + Exa<br /><small>collectors</small></div><div className="arrow">→</div><div className="flow-step">Supabase<br /><small>runs + observations</small></div></div><div className="notice">The dashboard is a review surface, not a journal. Every number above is either read from the database or deliberately shown as unavailable until a real provider result exists.</div></section>
    </main>
  </div>;
}
