import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPersistedAnalysisForRun } from "@/lib/analysis-persistence";
import { getReviewAccess } from "@/lib/review-access";
import { createServiceClient } from "@/lib/supabase";
import ReviewControls from "./review-controls";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ runId: string }> };

export default async function ReviewPage({ params }: Props) {
  const { runId } = await params;
  const access = await getReviewAccess();
  if (!access.ok) {
    if (access.status === 401) redirect(`/auth/login?next=${encodeURIComponent(`/review/${runId}`)}`);
    return <main className="auth-page"><section className="auth-card"><div className="eyebrow">AEO Loop / Review access</div><h1>Review is unavailable</h1><p className="subhead">{access.message}</p><Link className="detail-link" href="/findings">Return to findings →</Link></section></main>;
  }

  const analysis = await getPersistedAnalysisForRun(createServiceClient(), runId);
  if (!analysis) notFound();

  return <main className="review-page">
    <div className="breadcrumb"><Link href={`/runs/${runId}`}>Run detail</Link><span> / </span>Human review</div>
    <div className="topbar page-header"><div><div className="eyebrow">Observatory / Human review</div><h1>Review evidence-backed analysis</h1><p className="subhead">Check the draft, its linked evidence, and the proposed next action before creating a persisted finding.</p></div><span className="status-pill connected">● Authenticated reviewer</span></div>
    <section className="panel page-panel">
      <div className="panel-head"><span className="panel-title">Analysis snapshot</span><span className="panel-meta">{analysis.status} · {analysis.agent_version}</span></div>
      <div className="metadata-grid"><div><span className="detail-label">Analysis ID</span><code>{analysis.id}</code></div><div><span className="detail-label">Run ID</span><code>{analysis.run_id}</code></div><div><span className="detail-label">Prompt version</span><span>{analysis.prompt_version}</span></div><div><span className="detail-label">Evidence rows</span><span>{analysis.observation_ids.length}</span></div></div>
      {analysis.findings.length ? <div className="evidence-stack">{analysis.findings.map((finding) => <article className="evidence-card" key={finding.id}><div className="evidence-heading"><div><span className="eyebrow">Draft · {finding.kind.replace("_", " ")}</span><h2>{finding.title}</h2></div><span className={`priority-badge ${finding.priority}`}>{finding.priority} priority</span></div><div className="evidence-meta"><span>Confidence {Math.round(finding.confidence * 100)}%</span><span>{finding.evidenceIds.length} linked evidence row{finding.evidenceIds.length === 1 ? "" : "s"}</span></div><div className="draft-copy"><p>{finding.summary}</p><strong>Suggested next action</strong><p>{finding.recommendation}</p></div><div className="evidence-ids"><span className="detail-label">Evidence IDs</span>{finding.evidenceIds.map((evidenceId) => <code key={evidenceId}>{evidenceId}</code>)}</div></article>)}</div> : <div className="empty"><strong>No reviewable findings</strong>This analysis has no draft candidates.</div>}
    </section>
    {analysis.status === "draft" ? <ReviewControls runId={analysis.run_id} /> : <div className="notice">This analysis has already been reviewed as <strong>{analysis.status}</strong>; the review transition is one-way.</div>}
  </main>;
}
