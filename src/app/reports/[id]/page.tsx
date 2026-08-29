import Link from "next/link";
import { notFound } from "next/navigation";
import { ConnectionNotice, ObservatoryShell, PageHeader } from "../../_components/observatory-shell";
import { buildDailyPulseReport } from "@/lib/reporting";
import { formatDate, getFindingCount, getRunDetail, statusLabel } from "@/lib/observatory";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ReportDetailPage({ params }: Props) {
  const { id } = await params;
  const [runResult, findingCount] = await Promise.all([getRunDetail(id), getFindingCount()]);
  const { run, observations, findings } = runResult.data;
  if (!run) notFound();

  const report = buildDailyPulseReport({ run, observations, findings });
  const citationKpi = report.kpis.find((kpi) => kpi.key === "synthetic_citation_rate");

  return <ObservatoryShell active="runs" findingCount={findingCount}>
    <div className="breadcrumb"><Link href={`/runs/${run.id}`}>Run detail</Link><span> / </span>Report</div>
    <PageHeader eyebrow="Observatory / Report detail" title="Daily pulse report" description="A reproducible report derived from the stored run, without re-calling Firecrawl or Exa." connected={runResult.connected} />
    <ConnectionNotice connected={runResult.connected} />

    <section className="cards" aria-label="Report metrics">
      <div className="card"><div className="card-label">Run health</div><div className={`metric metric-status ${run.status}`}>{statusLabel(run.status)}</div><div className="metric-note">{formatDate(run.completed_at ?? run.started_at)}</div></div>
      <div className="card"><div className="card-label">Citation rate</div><div className="metric">{citationKpi?.displayValue ?? "—"}</div><div className="metric-note">{citationKpi?.denominator ? `${citationKpi.denominator} observed checks` : "not measurable"}</div></div>
      <div className="card"><div className="card-label">Evidence rows</div><div className="metric">{observations.length}</div><div className="metric-note">replayed from Supabase</div></div>
      <div className="card"><div className="card-label">Open actions</div><div className="metric">{report.actions.length}</div><div className="metric-note">findings awaiting review</div></div>
    </section>

    <section className="panel page-panel"><div className="panel-head"><span className="panel-title">Report contract</span><span className="panel-meta">{report.schemaVersion}</span></div><div className="metadata-grid"><div><span className="detail-label">Event ID</span><code>{report.eventId}</code></div><div><span className="detail-label">Comparison</span><span>Previous 7 complete days</span></div><div><span className="detail-label">Window start</span><span>{formatDate(report.window.start)}</span></div><div><span className="detail-label">Window end</span><span>{formatDate(report.window.end)}</span></div><div><span className="detail-label">Source run</span><Link className="detail-link" href={`/runs/${run.id}`}>{run.id}</Link></div><div><span className="detail-label">Delivery</span><span className="muted">Not activated</span></div></div></section>

    <section className="content-grid">
      <div className="panel page-panel"><div className="panel-head"><span className="panel-title">Funnel</span><span className="panel-meta">derived from this run</span></div><div className="topic-list">{report.funnel.stages.map((stage, index) => <div className="topic-row" key={stage.key}><div><div className="topic-name">{index + 1}. {stage.label}</div><div className="topic-meta">{stage.status === "not_connected" ? "Not connected" : stage.status === "not_measurable" ? "Not measurable from this run" : "Observed"}</div></div><div className="topic-score"><strong>{stage.value ?? "—"}</strong><span>{stage.status.replaceAll("_", " ")}</span></div></div>)}<div className="notice">Biggest leak: <strong>{report.funnel.biggestLeak.from} → {report.funnel.biggestLeak.to}</strong> is not measurable until the next signal is connected.</div></div></div>
      <div className="panel page-panel"><div className="panel-head"><span className="panel-title">Provider health</span><span className="panel-meta">freshness included</span></div><div className="topic-list">{report.providerHealth.length ? report.providerHealth.map((provider) => <div className="topic-row" key={provider.provider}><div><div className="topic-name">{provider.provider}</div><div className="topic-meta">{provider.freshness ? formatDate(provider.freshness) : "No observation timestamp"}</div></div><div className="topic-score"><strong>{provider.status}</strong><span>latest state</span></div></div>) : <div className="empty"><strong>No provider records</strong>No provider results are present in this run.</div>}</div></div>
    </section>

    <div className="notice">This report is a derived review artifact. It does not send Slack/Zapier messages, create Linear issues, or claim human traffic until those adapters are connected.</div>
  </ObservatoryShell>;
}
