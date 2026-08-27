import Link from "next/link";
import { buildDraftFindings } from "@/lib/analysis";
import { ConnectionNotice, ObservatoryShell, PageHeader } from "../_components/observatory-shell";
import { formatDate, getFindingCount, getFindings, getRunDetail, getRuns, statusLabel } from "@/lib/observatory";

export const dynamic = "force-dynamic";

export default async function FindingsPage() {
  const [findingsResult, runsResult, findingCount] = await Promise.all([getFindings(), getRuns(1), getFindingCount()]);
  const latestRun = runsResult.data[0];
  const latestDetail = latestRun ? await getRunDetail(latestRun.id) : null;
  const drafts = latestDetail?.data.run ? buildDraftFindings({ run: latestDetail.data.run, observations: latestDetail.data.observations }) : [];
  const connected = findingsResult.connected && runsResult.connected && (latestDetail?.connected ?? true);

  return <ObservatoryShell active="findings" findingCount={findingCount}>
    <PageHeader eyebrow="Observatory / Findings" title="Evidence into decisions" description="Persisted findings and review-only recommendations derived from the latest real observation run." connected={connected} />
    <ConnectionNotice connected={connected} />

    <section className="cards" aria-label="Finding metrics">
      <div className="card"><div className="card-label">Open findings</div><div className="metric">{findingCount}</div><div className="metric-note">persisted in Supabase</div></div>
      <div className="card"><div className="card-label">Draft candidates</div><div className="metric">{drafts.length}</div><div className="metric-note">latest run · not yet persisted</div></div>
      <div className="card"><div className="card-label">Evidence source</div><div className="metric metric-small">{latestRun ? "Latest run" : "—"}</div><div className="metric-note">recommendations require evidence</div></div>
      <div className="card"><div className="card-label">Automation state</div><div className="metric metric-small">Draft-only</div><div className="metric-note">no external actions triggered</div></div>
    </section>

    <section className="panel page-panel">
      <div className="panel-head"><span className="panel-title">Draft recommendations</span><span className="panel-meta">derived from {latestRun ? formatDate(latestRun.created_at) : "no run"}</span></div>
      {drafts.length ? <div className="evidence-stack">{drafts.map((draft) => <article className="evidence-card" key={draft.id}>
        <div className="evidence-heading"><div><span className="eyebrow">Draft · {draft.kind.replace("_", " ")}</span><h2>{draft.title}</h2></div><span className={`priority-badge ${draft.priority}`}>{draft.priority} priority</span></div>
        <div className="evidence-meta"><span>Confidence {Math.round(draft.confidence * 100)}%</span><span>{draft.evidenceIds.length} evidence row{draft.evidenceIds.length === 1 ? "" : "s"}</span><Link className="detail-link" href={`/runs/${draft.runId}`}>Open source run →</Link></div>
        <div className="draft-copy"><p>{draft.summary}</p><strong>Suggested next action</strong><p>{draft.recommendation}</p></div>
        <div className="evidence-ids"><span className="detail-label">Evidence IDs</span>{draft.evidenceIds.map((evidenceId) => <code key={evidenceId}>{evidenceId}</code>)}</div>
      </article>)}</div> : <div className="empty"><strong>No draft recommendations</strong>A draft is created only when a real stored observation provides a reviewable gap or technical failure.</div>}
    </section>

    <section className="panel page-panel">
      <div className="panel-head"><span className="panel-title">Persisted findings</span><span className="panel-meta">database records · {findingsResult.data.length}</span></div>
      {findingsResult.data.length ? <div className="topic-list">{findingsResult.data.map((finding) => <article className="topic-row" key={finding.id}><div><div className="topic-name">{finding.title}</div><div className="topic-meta">{finding.kind} · {finding.priority} priority · {statusLabel(finding.status)} · created {formatDate(finding.created_at)}</div><p className="finding-summary">{finding.summary}</p><p className="finding-recommendation">Recommendation: {finding.recommendation}</p></div><div className="topic-score"><strong>{finding.confidence === null ? "—" : `${Math.round(finding.confidence * 100)}%`}</strong><span>confidence</span></div></article>)}</div> : <div className="empty"><strong>No persisted findings yet</strong>Draft recommendations remain separate until a future human-reviewed analysis step stores a finding.</div>}
    </section>

    <section className="panel architecture"><div className="panel-title">What happens next</div><div className="flow"><div className="flow-step">Stored evidence<br /><small>Supabase rows</small></div><div className="arrow">→</div><div className="flow-step">Draft finding<br /><small>this screen</small></div><div className="arrow">→</div><div className="flow-step">Human review<br /><small>approve / reject</small></div><div className="arrow">→</div><div className="flow-step">Linear + PR<br /><small>later phase</small></div></div><div className="notice">Drafts are intentionally not written back to Supabase and cannot create Linear issues, Slack messages, portfolio changes, or deployments. That approval boundary is the next part of ANT-36.</div></section>
  </ObservatoryShell>;
}
