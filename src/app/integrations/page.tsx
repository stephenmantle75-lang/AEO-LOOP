import { ConnectionNotice, ObservatoryShell, PageHeader } from "../_components/observatory-shell";
import { deliveryStatusLabel, deliveryStatusTone, formatDate, getOverviewData, getReportDeliveryStatus, providerLabel } from "@/lib/observatory";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const result = await getOverviewData();
  const latest = result.data.runs[0];
  const observations = result.data.latestObservations;
  const delivery = latest ? await getReportDeliveryStatus(latest.id) : null;

  return <ObservatoryShell active="integrations" findingCount={result.data.findings.filter((finding) => finding.status === "new").length}>
    <PageHeader eyebrow="Observatory / Integrations" title="Every connection has a job" description="The integration map shows where evidence comes from, where decisions are recorded, and which delivery bridges are still intentionally off." connected={result.connected} />
    <ConnectionNotice connected={result.connected} />

    <section className="panel page-panel"><div className="panel-head"><span className="panel-title">Current connection health</span><span className="panel-meta">latest stored run</span></div><div className="integration-grid">
      <article className="integration-card"><div className="integration-state connected">●</div><div><h2>Supabase</h2><p>System of record for runs, observations, and findings.</p><span>{result.connected ? "Connected" : "Waiting for server-only variables"}</span></div></article>
      {["firecrawl", "exa"].map((provider) => { const observation = observations.find((item) => item.provider === provider); return <article className="integration-card" key={provider}><div className={`integration-state ${observation?.status === "failed" ? "failed" : observation ? "connected" : "pending"}`}>●</div><div><h2>{providerLabel(provider)}</h2><p>{provider === "firecrawl" ? "Page integrity and crawlability check." : "Synthetic discovery and citation check."}</p><span>{observation ? `${observation.status} · ${formatDate(observation.observed_at)}` : "Not run"}</span></div></article>; })}
      <article className="integration-card"><div className="integration-state pending">○</div><div><h2>Search Console</h2><p>Real search impressions, clicks, CTR, and position.</p><span>Not connected · metrics unavailable</span></div></article>
      <article className="integration-card"><div className={`integration-state ${delivery?.readError ? "failed" : delivery?.status ? "connected" : "pending"}`}>●</div><div><h2>Slack</h2><p>Daily pulse and finding alerts, posted to #aeo-growth-loop.</p><span>{delivery?.readError ? deliveryStatusLabel(delivery) : delivery?.status ? `${deliveryStatusLabel(delivery)} · latest report` : "No report delivered yet"}</span></div></article>
      <article className="integration-card"><div className="integration-state pending">○</div><div><h2>Linear / Zapier</h2><p>Approved delivery and operator notification path.</p><span>Intent queue active · not connected</span></div></article>
    </div></section>

    <section className="content-grid"><div className="panel panel-pad"><div className="panel-head panel-head-tight"><span className="panel-title">Latest collection handoff</span><span className="panel-meta">{latest ? latest.status : "no run"}</span></div>{latest ? <div className="detail-grid compact"><div><span className="detail-label">Run</span><span className="detail-value">{latest.run_key}</span></div><div><span className="detail-label">Sources</span><span className="detail-value">{latest.sources.map(providerLabel).join(" · ")}</span></div><div><span className="detail-label">Recorded</span><span className="detail-value">{formatDate(latest.completed_at ?? latest.created_at)}</span></div><div><span className="detail-label">Delivery</span><span className={`provider-state ${deliveryStatusTone(delivery)}`}><span className={`dot ${deliveryStatusTone(delivery)}`} />{deliveryStatusLabel(delivery)}</span></div></div> : <div className="empty"><strong>No collection handoff yet</strong>A real run will show which providers returned evidence.</div>}</div><div className="panel panel-pad"><div className="panel-head panel-head-tight"><span className="panel-title">Boundary</span><span className="panel-meta">important</span></div><p className="plain-copy">Supabase owns the record. The Observatory reads it. Linear owns approved work. Zapier is only a bridge. Slack is the notification surface. None of the delivery tools should calculate metrics or replace the database.</p></div></section>

    <section className="panel architecture"><div className="panel-title">How integrations connect</div><div className="flow"><div className="flow-step">Providers<br /><small>Firecrawl · Exa</small></div><div className="arrow">→</div><div className="flow-step">Supabase<br /><small>source of truth</small></div><div className="arrow">→</div><div className="flow-step">Findings<br /><small>human review</small></div><div className="arrow">→</div><div className="flow-step">Delivery<br /><small>Linear · Slack</small></div></div><div className="notice">A green connection indicator means the application can read the relevant source. It does not mean every adapter is enabled or that the latest provider result was successful.</div></section>
  </ObservatoryShell>;
}
