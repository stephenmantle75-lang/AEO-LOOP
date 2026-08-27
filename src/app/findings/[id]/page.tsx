import Link from "next/link";
import { notFound } from "next/navigation";
import { ConnectionNotice, ObservatoryShell, PageHeader } from "../../_components/observatory-shell";
import { displayUrl, formatDate, getFindingCount, getFindingDetail, observationLabel, providerLabel, statusLabel } from "@/lib/observatory";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function FindingDetailPage({ params }: Props) {
  const { id } = await params;
  const [detailResult, findingCount] = await Promise.all([getFindingDetail(id), getFindingCount()]);
  const { finding, run, observations } = detailResult.data;
  if (!finding) notFound();

  return <ObservatoryShell active="findings" findingCount={findingCount}>
    <div className="breadcrumb"><Link href="/findings">Findings</Link><span> / </span>{finding.title}</div>
    <PageHeader eyebrow="Observatory / Finding detail" title={finding.title} description="The evidence, recommendation, and review boundary for one persisted finding." connected={detailResult.connected} />
    <ConnectionNotice connected={detailResult.connected} />

    <section className="cards topic-cards" aria-label="Finding metrics">
      <div className="card"><div className="card-label">Status</div><div className={`metric metric-status ${finding.status}`}>{statusLabel(finding.status)}</div><div className="metric-note">persisted finding</div></div>
      <div className="card"><div className="card-label">Priority</div><div className={`metric metric-status ${finding.priority}`}>{finding.priority}</div><div className="metric-note">review order</div></div>
      <div className="card"><div className="card-label">Confidence</div><div className="metric">{finding.confidence === null ? "—" : `${Math.round(finding.confidence * 100)}%`}</div><div className="metric-note">analysis confidence</div></div>
      <div className="card"><div className="card-label">Linked evidence</div><div className="metric">{finding.evidence_ids.length}</div><div className="metric-note">rows caused this finding</div></div>
    </section>

    <section className="panel page-panel">
      <div className="panel-head"><span className="panel-title">Finding brief</span><span className="panel-meta">source of truth: Supabase</span></div>
      <div className="metadata-grid">
        <div><span className="detail-label">Finding ID</span><code>{finding.id}</code></div>
        <div><span className="detail-label">Topic</span><span>{finding.topic_key}</span></div>
        <div><span className="detail-label">Created</span><span>{formatDate(finding.created_at, true)}</span></div>
        <div><span className="detail-label">Source run</span>{run ? <Link className="detail-link" href={`/runs/${run.id}`}>{run.run_key}</Link> : <span className="muted">Unavailable</span>}</div>
      </div>
      <div className="draft-copy"><strong>Summary</strong><p>{finding.summary}</p><strong>Recommendation</strong><p>{finding.recommendation}</p></div>
      <div className="notice">Review-only boundary: this screen does not approve the finding, modify the portfolio, create a Linear issue, send Slack/Zapier, or deploy code.</div>
    </section>

    <section className="panel page-panel">
      <div className="panel-head"><span className="panel-title">Evidence that caused this finding</span><span className="panel-meta">{observations.length} matched rows</span></div>
      {observations.length ? <div className="evidence-stack">{observations.map((observation) => <article className="evidence-card" key={observation.id}>
        <div className="evidence-heading"><div><span className="eyebrow">{providerLabel(observation.provider)} · {observationLabel(observation.observation_type)}</span><h2>{observation.question}</h2></div><span className={`run-status ${observation.status}`}><span className={`dot ${observation.status}`} />{statusLabel(observation.status)}</span></div>
        <div className="evidence-meta"><span>Observed {formatDate(observation.observed_at, true)}</span><span>Target {displayUrl(observation.target_url)}</span><span>Evidence ID <code>{observation.id}</code></span></div>
        {observation.status === "failed" ? <div className="notice error-notice">{observation.error_message ?? "Provider failed without a message"}</div> : <div className="evidence-result"><strong>{observation.provider === "exa" ? (observation.citation_found ? "Citation found" : "No citation found") : "Document inspected"}</strong>{observation.answer_text && <p>{observation.answer_text.slice(0, 640)}{observation.answer_text.length > 640 ? "…" : ""}</p>}{observation.citations.length ? <div className="citation-list"><span className="detail-label">Citations returned</span>{observation.citations.map((citation) => <a href={citation.url} key={`${observation.id}-${citation.url}`}>{citation.title ?? citation.url}</a>)}</div> : <span className="muted">No citation URLs stored.</span>}</div>}
      </article>)}</div> : <div className="empty"><strong>No matching evidence rows</strong>The finding references evidence that is not available in the related run response.</div>}
    </section>

    <section className="panel architecture"><div className="panel-title">Review path</div><div className="flow"><div className="flow-step">Evidence<br /><small>stored row</small></div><div className="arrow">→</div><div className="flow-step">Finding<br /><small>this record</small></div><div className="arrow">→</div><div className="flow-step">Human review<br /><small>next gate</small></div><div className="arrow">→</div><div className="flow-step">Controlled PR<br /><small>later phase</small></div></div></section>
  </ObservatoryShell>;
}
