import Link from "next/link";
import { ConnectionNotice, ObservatoryShell, PageHeader } from "../_components/observatory-shell";
import { formatDate, getTopicSummaries } from "@/lib/observatory";

export const dynamic = "force-dynamic";

export default async function ExperimentsPage() {
  const result = await getTopicSummaries();
  const topic = result.data.find((item) => item.key === "seo-vs-aeo-portfolio") ?? result.data[0];

  return <ObservatoryShell active="experiments">
    <PageHeader eyebrow="Observatory / Experiments" title="Controlled change, measured twice" description="A place to define one deliberate page change, keep a control, and compare the next real observation against the baseline." connected={result.connected} />
    <ConnectionNotice connected={result.connected} />

    <section className="cards" aria-label="Experiment state">
      <div className="card"><div className="card-label">Experiment state</div><div className="metric metric-small">Design required</div><div className="metric-note">No variant has been approved</div></div>
      <div className="card"><div className="card-label">Control</div><div className="metric metric-small">Current page</div><div className="metric-note">Keep unchanged for comparison</div></div>
      <div className="card"><div className="card-label">Variant</div><div className="metric metric-small">Draft only</div><div className="metric-note">Requires human review and PR</div></div>
      <div className="card"><div className="card-label">Success measure</div><div className="metric metric-small">Citation rate</div><div className="metric-note">Observed Exa checks, with denominator</div></div>
    </section>

    <section className="panel page-panel">
      <div className="panel-head"><span className="panel-title">Measurement subject</span><span className="panel-meta">source: Supabase topic observations</span></div>
      {topic ? <div className="detail-grid"><div><span className="detail-label">Topic</span><span className="detail-value">{topic.question}</span></div><div><span className="detail-label">Target</span><span className="detail-value">{topic.targetUrl || "Not configured"}</span></div><div><span className="detail-label">Observed rows</span><span className="detail-value">{topic.observationCount} total · {topic.observedCount} observed · {topic.failedCount} failed</span></div><div><span className="detail-label">Last evidence</span><span className="detail-value">{formatDate(topic.lastObservedAt)}</span></div></div> : <div className="empty"><strong>No measured topic yet</strong>The experiment cannot begin until a real baseline topic is stored.</div>}
    </section>

    <section className="content-grid">
      <div className="panel panel-pad"><div className="panel-head panel-head-tight"><span className="panel-title">Control / variant contract</span><span className="panel-meta">human approval required</span></div><div className="experiment-list"><div><strong>A · Control</strong><span>Existing answer page and fixed prompt set. Do not change during the comparison window.</span></div><div><strong>B · Variant</strong><span>One focused answer-page improvement, linked to a finding and shipped through a reviewed GitHub PR.</span></div><div><strong>Compare</strong><span>Run the same prompts after deployment and report denominator, window, provider, and uncertainty.</span></div></div><Link className="panel-link" href="/insights/seo-vs-aeo-portfolio">Open controlled answer page →</Link><Link className="panel-link" href="/topics/seo-vs-aeo-portfolio-variant-b">Open Variant B topic →</Link></div>
      <div className="panel panel-pad"><div className="panel-head panel-head-tight"><span className="panel-title">Guardrails</span><span className="panel-meta">no automatic publishing</span></div><div className="experiment-list"><div><strong>Evidence first</strong><span>A variant must reference stored observation IDs.</span></div><div><strong>One change</strong><span>Keep the test narrow enough to explain a result.</span></div><div><strong>Negative results count</strong><span>0% citation is a valid baseline, not a reason to rewrite the record.</span></div></div></div>
    </section>

    <section className="panel architecture"><div className="panel-title">How an experiment moves through the system</div><div className="flow"><div className="flow-step">Baseline<br /><small>stored run</small></div><div className="arrow">→</div><div className="flow-step">Finding<br /><small>evidence-linked</small></div><div className="arrow">→</div><div className="flow-step">Variant PR<br /><small>CI + preview</small></div><div className="arrow">→</div><div className="flow-step">Retest<br /><small>same prompts</small></div></div><div className="notice">This screen defines the experiment. It does not claim that a variant exists, a lift has occurred, or that production can be changed automatically.</div></section>
  </ObservatoryShell>;
}
