import { ConnectionNotice, ObservatoryShell, PageHeader } from "../_components/observatory-shell";
import { getOverviewData } from "@/lib/observatory";
import { xTrackingConnections, xTrackingMetrics, xTrackingStages } from "@/lib/x-tracking";
import { Fragment } from "react";

export const dynamic = "force-dynamic";

export default async function XTrackingPage() {
  const result = await getOverviewData();
  const openFindings = result.data.findings.filter((finding) => finding.status === "new").length;

  return <ObservatoryShell active="x-tracking" findingCount={openFindings}>
    <PageHeader
      eyebrow="Observatory / X tracking"
      title="Track the conversation, keep the asset"
      description="A measurement surface for the X campaign. It separates attention from useful response and connects each post back to the Notes page that should compound."
      connected={result.connected}
      statusTone="neutral"
      statusText="● Plan ready · X not connected"
    />
    <ConnectionNotice connected={result.connected} />

    <section className="cards" aria-label="X tracking state">
      <div className="card"><div className="card-label">Posts tracked</div><div className="metric metric-small">—</div><div className="metric-note">No X API collection yet</div></div>
      <div className="card"><div className="card-label">Private metrics</div><div className="metric metric-small">Planned</div><div className="metric-note">Requires account OAuth</div></div>
      <div className="card"><div className="card-label">Durable asset</div><div className="metric metric-small">Notes</div><div className="metric-note">The campaign&apos;s canonical source</div></div>
      <div className="card"><div className="card-label">Decision rule</div><div className="metric metric-small">Learn</div><div className="metric-note">Reach is not business proof</div></div>
    </section>

    <section className="panel page-panel">
      <div className="panel-head"><span className="panel-title">What this tab measures</span><span className="panel-meta">no sample data</span></div>
      <div className="detail-grid">{xTrackingMetrics.map((metric) => <div key={metric.label}><span className="detail-label">{metric.label}</span><span className="detail-value">{metric.source} · {metric.status}</span><small>{metric.note}</small></div>)}</div>
    </section>

    <section className="content-grid">
      <div className="panel panel-pad"><div className="panel-head panel-head-tight"><span className="panel-title">Measurement contract</span><span className="panel-meta">90-day account evidence</span></div><div className="experiment-list"><div><strong>Attention</strong><span>Impressions, views, likes, reposts, replies, and quote posts. Useful for distribution, not proof of value.</span></div><div><strong>Response</strong><span>Replies that show lived experience, profile visits, and meaningful conversation.</span></div><div><strong>Compounding</strong><span>Visits to the linked Notes page and the next action taken. This is the durable part of the experiment.</span></div><div><strong>Learning</strong><span>Hook, format, cadence, restriction window, limitations, and what changes in the next batch.</span></div></div></div>
      <div className="panel panel-pad"><div className="panel-head panel-head-tight"><span className="panel-title">Connections</span><span className="panel-meta">boundary map</span></div><div className="experiment-list">{xTrackingConnections.map((connection) => <div key={connection.name}><strong>{connection.name}<em>{connection.state}</em></strong><span>{connection.role}</span></div>)}</div></div>
    </section>

    <section className="panel architecture"><div className="panel-title">How one post becomes a learning record</div><div className="flow">{xTrackingStages.map(([label, note], index) => <Fragment key={label}><div className="flow-step">{label}<br /><small>{note}</small></div>{index < xTrackingStages.length - 1 && <div className="arrow">→</div>}</Fragment>)}</div><div className="notice">X is the conversation surface. Supabase is the measurement ledger. Notion and Linear hold context and decisions. The Notes page is the public asset. No provider result is presented until a real collection run records it.</div></section>

    <section className="panel page-panel"><div className="panel-head"><span className="panel-title">Human explanation</span><span className="panel-meta">why this lives here</span></div><p className="plain-copy">This is an extension of the existing Observatory, not a separate dashboard. The same review loop already stores runs and provider evidence. X adds a second evidence stream: what earned attention, what created a useful response, and whether the public Notes asset kept working after the post disappeared from the feed. The dashboard should help Stephen change the next hypothesis, not chase a viral number.</p><div className="notice">Current state: design and boundary documented. X credentials, OAuth, site events, and the first real post registry still need to be connected before any metric is called live.</div></section>
  </ObservatoryShell>;
}
