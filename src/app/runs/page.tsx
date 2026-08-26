import Link from "next/link";
import { ConnectionNotice, ObservatoryShell, PageHeader } from "../_components/observatory-shell";
import { formatCost, formatDate, formatDuration, getFindingCount, getRuns, runLabel, statusLabel } from "@/lib/observatory";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const [runsResult, findingCount] = await Promise.all([getRuns(), getFindingCount()]);
  return <ObservatoryShell active="runs" findingCount={findingCount}>
    <PageHeader eyebrow="Observatory / Runs" title="Every collection run" description="The run ledger is the operational spine of the loop. Open one to inspect its exact inputs and evidence." connected={runsResult.connected} />
    <ConnectionNotice connected={runsResult.connected} />
    <section className="panel page-panel"><div className="panel-head"><span className="panel-title">Observation run ledger</span><span className="panel-meta">latest {runsResult.data.length} runs</span></div>{runsResult.data.length ? <div className="table-wrap"><table><thead><tr><th>Run</th><th>Status</th><th>Started</th><th>Duration</th><th>Cost</th><th>Sources</th></tr></thead><tbody>{runsResult.data.map((run) => <tr key={run.id}><td><Link className="table-link" href={`/runs/${run.id}`}>{runLabel(run.run_key)}</Link><small>{run.run_type} · {run.id}</small></td><td><span className="run-status"><span className={`dot ${run.status}`} />{statusLabel(run.status)}</span></td><td>{formatDate(run.started_at)}</td><td>{formatDuration(run.duration_ms)}</td><td>{formatCost(run.cost_usd)}</td><td>{run.sources.length ? run.sources.join(" · ") : "None recorded"}</td></tr>)}</tbody></table></div> : <div className="empty"><strong>No runs have been recorded</strong>The protected daily route will create the first row after a real collection attempt.</div>}</section>
    <div className="notice">A run can be <strong>succeeded</strong>, <strong>partial</strong>, or <strong>failed</strong>. The dashboard does not hide partial collection behind a green status.</div>
  </ObservatoryShell>;
}
