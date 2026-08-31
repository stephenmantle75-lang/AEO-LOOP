import Link from "next/link";
import { publicErrorMessage } from "@/lib/api-response";
import { ConnectionNotice, ObservatoryShell, PageHeader } from "./_components/observatory-shell";
import { citationRate, deliveryStatusLabel, deliveryStatusTone, displayUrl, formatCost, formatDate, formatDuration, getOverviewData, getReportDeliveryStatus, observationLabel, providerLabel, runLabel } from "@/lib/observatory";
import { buildDailyPulseReport } from "@/lib/reporting";

export const dynamic = "force-dynamic";

export default async function ObservatoryPage() {
  const result = await getOverviewData();
  const { runs, findings, runningRunCount, staleRunCount, observationCount, observationCountError, latestObservations, latestObservationsError } = result.data;
  const latest = runs[0];
  const rate = citationRate(latestObservations);
  const openFindings = findings.filter((finding) => finding.status === "new").length;
  const report = latest ? buildDailyPulseReport({ run: latest, observations: latestObservations, findings }) : null;
  const delivery = latest ? await getReportDeliveryStatus(latest.id) : null;

  return <ObservatoryShell active="overview" findingCount={openFindings}>
    <PageHeader eyebrow="Observatory / Overview" title="Good morning, Stephen." description="A live review of what the AEO loop observed, learned, and is ready to review." connected={result.connected} />
    <ConnectionNotice connected={result.connected} />
    {(observationCountError || latestObservationsError) && <div className="notice" role="status">Some Observatory metrics are temporarily unavailable. Other database-backed sections remain visible; refresh to retry the unavailable read.</div>}

    <section className="cards" aria-label="Key metrics">
      <div className="card"><div className="card-label">Latest run</div><div className={`metric metric-status ${latest?.status ?? "empty"}`}>{latest?.status ?? "—"}</div><div className="metric-note">{latest ? formatDate(latest.created_at) : "No run recorded"}</div></div>
      <div className="card"><div className="card-label">Citation rate</div><div className="metric">{rate === null ? "—" : `${rate}%`}</div><div className="metric-note">{rate === null ? "Awaiting Exa evidence" : `${latestObservations.filter((item) => item.provider === "exa" && item.status === "observed" && item.citation_found).length} cited checks in latest run`}</div></div>
      <div className="card"><div className="card-label">Evidence captured</div><div className="metric">{observationCount === null ? "—" : observationCount}</div><div className="metric-note">{observationCount === null ? "count temporarily unavailable" : "observations stored in Supabase"}</div></div>
      <div className="card"><div className="card-label">Open findings</div><div className="metric">{openFindings}</div><div className="metric-note">human review required</div></div>
    </section>

    <section className="panel monitoring-panel" aria-label="Run monitoring snapshot">
      <div className="panel-head"><span className="panel-title">Run monitoring</span><span className={`provider-state ${staleRunCount ? "failed" : "observed"}`}><span className={`dot ${staleRunCount ? "failed" : "success"}`} />{staleRunCount ? `${staleRunCount} stale` : "No stale runs"}</span></div>
      <div className="monitoring-body"><div><strong>{runningRunCount}</strong><span>active runs</span></div><div><strong>{staleRunCount}</strong><span>stale heartbeats</span></div><p>This is a page-load snapshot of running records. A stale heartbeat means a running job has not reported within 45 seconds; investigate the run detail and provider logs before retrying.</p></div>
    </section>

    <section className="content-grid">
      <div className="panel panel-pad">
        <div className="panel-head panel-head-tight"><span className="panel-title">Latest observation run</span>{latest && <span className={`run-status ${latest.status}`}><span className={`dot ${latest.status}`} />{latest.status}</span>}</div>
        {latest ? <><div className="run-key">{runLabel(latest.run_key)}</div><div className="run-meta"><span>Started {formatDate(latest.started_at)}</span><span>{formatDuration(latest.duration_ms)}</span><span>{formatCost(latest.cost_usd)} provider cost</span></div><div className="source-chips">{latest.sources.map((source) => <span className="source-chip" key={source}>{providerLabel(source)}</span>)}</div><Link className="panel-link" href={`/runs/${latest.id}`}>Open run detail →</Link></> : <div className="empty"><strong>No observation runs yet</strong>The first protected daily run will appear here after the cron route writes evidence.</div>}
      </div>
      <div className="panel panel-pad"><div className="panel-head panel-head-tight"><span className="panel-title">Provider health</span><span className="panel-meta">latest run</span></div><div className="provider-list">{["firecrawl", "exa"].map((provider) => { const observation = latestObservations.find((item) => item.provider === provider); const state = latestObservationsError ? "unavailable" : observation?.status ?? "not-run"; return <div className="provider-row" key={provider}><div><strong>{providerLabel(provider)}</strong><span>{provider === "firecrawl" ? "target page integrity" : "synthetic citation check"}</span></div><span className={`provider-state ${state}`}><span className={`dot ${state}`} />{state.replace("-", " ")}</span></div>; })}</div></div>
    </section>

    <section className="panel evidence-panel"><div className="panel-head"><span className="panel-title">Latest evidence</span><span className="panel-meta">{latest ? `${latestObservations.length} records from Supabase` : "no records"}</span></div>{latestObservations.length ? <div className="table-wrap"><table><thead><tr><th>Provider</th><th>Check</th><th>Status</th><th>Target</th><th>Result</th></tr></thead><tbody>{latestObservations.map((observation) => <tr key={observation.id}><td><strong>{providerLabel(observation.provider)}</strong></td><td>{observationLabel(observation.observation_type)}<small>{observation.question}</small></td><td><span className="run-status"><span className={`dot ${observation.status}`} />{observation.status}</span></td><td className="target-cell">{displayUrl(observation.target_url)}</td><td>{observation.status === "failed" ? <span className="result-error">{observation.error_message ?? "Provider failed"}</span> : observation.provider === "exa" ? <span className={observation.citation_found ? "result-positive" : "result-muted"}>{observation.citation_found ? "Citation found" : "No citation found"}</span> : <span className="result-positive">Document inspected</span>}</td></tr>)}</tbody></table></div> : <div className="empty"><strong>{latestObservationsError ? "Latest evidence could not be loaded" : "No evidence for the latest run"}</strong>{latestObservationsError ? "The database read was unavailable; refresh to retry without treating this as a provider failure." : "Evidence rows will appear here after a real provider collection completes."}</div>}</section>

    {report && <section className="content-grid"><div className="panel panel-pad"><div className="panel-head panel-head-tight"><span className="panel-title">Daily pulse preview</span><span className="panel-meta">{report.schemaVersion}</span></div><div className="run-key">{report.health} · {report.kpis[0].displayValue} cited</div><div className="run-meta"><span>Denominator: {report.kpis[0].denominator ?? "not measurable"}</span><span>Freshness: {report.kpis[0].freshness ? formatDate(report.kpis[0].freshness) : "—"}</span></div>{delivery && <div className="run-meta"><span>Delivery: <span className={`provider-state ${deliveryStatusTone(delivery.status)}`}><span className={`dot ${deliveryStatusTone(delivery.status)}`} />{deliveryStatusLabel(delivery.status)}</span></span></div>}<Link className="panel-link" href={`/reports/${latest.id}`}>Open reproducible report →</Link></div><div className="panel panel-pad"><div className="panel-head panel-head-tight"><span className="panel-title">Funnel status</span><span className="panel-meta">next signal</span></div><div className="provider-list">{report.funnel.stages.map((stage) => <div className="provider-row" key={stage.key}><div><strong>{stage.label}</strong><span>{stage.status.replaceAll("_", " ")}</span></div><span className="provider-state"><span className="dot" />{stage.value ?? "—"}</span></div>)}</div></div></section>}

    <section className="panel architecture"><div className="panel-title">How this screen gets its evidence</div><div className="flow"><div className="flow-step">Vercel Cron<br /><small>daily trigger</small></div><div className="arrow">→</div><div className="flow-step">Firecrawl + Exa<br /><small>collectors</small></div><div className="arrow">→</div><div className="flow-step">Supabase<br /><small>runs + observations</small></div><div className="arrow">→</div><div className="flow-step">Observatory<br /><small>review surface</small></div></div><div className="notice">This is a database-backed review surface. Numbers are read from Supabase, and provider failures remain visible instead of being converted into zeros.</div></section>
  </ObservatoryShell>;
}
