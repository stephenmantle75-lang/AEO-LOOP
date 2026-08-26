import Link from "next/link";
import { notFound } from "next/navigation";
import { ConnectionNotice, ObservatoryShell, PageHeader } from "../../_components/observatory-shell";
import { citationRate, displayUrl, formatDate, getFindingCount, getTopicObservations, observationLabel, providerLabel, statusLabel, topicDefinition } from "@/lib/observatory";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ key: string }> };

export default async function TopicDetailPage({ params }: Props) {
  const { key } = await params;
  const topic = topicDefinition(key);
  if (!topic) notFound();
  const [observationsResult, findingCount] = await Promise.all([getTopicObservations(key), getFindingCount()]);
  const observations = observationsResult.data;
  const rate = citationRate(observations);
  return <ObservatoryShell active="topics" findingCount={findingCount}>
    <div className="breadcrumb"><Link href="/topics">Topics</Link><span> / </span>{key}</div>
    <PageHeader eyebrow="Observatory / Topic detail" title={topic.question} description="A chronological view of the provider evidence collected for this topic." connected={observationsResult.connected} />
    <ConnectionNotice connected={observationsResult.connected} />
    <section className="cards topic-cards" aria-label="Topic metrics"><div className="card"><div className="card-label">Citation rate</div><div className="metric">{rate === null ? "—" : `${rate}%`}</div><div className="metric-note">Exa observed checks only</div></div><div className="card"><div className="card-label">Observations</div><div className="metric">{observations.length}</div><div className="metric-note">stored evidence rows</div></div><div className="card"><div className="card-label">Target page</div><div className="metric metric-small">{displayUrl(topic.targetUrl)}</div><div className="metric-note">configured measurement target</div></div></section>
    <section className="panel page-panel"><div className="panel-head"><span className="panel-title">Measurement contract</span><span className="panel-meta">{topic.prompts.length} fixed prompts</span></div><div className="detail-grid"><div><span className="detail-label">Target URL</span><a className="detail-value detail-link" href={topic.targetUrl}>{topic.targetUrl}</a></div><div><span className="detail-label">Question</span><span className="detail-value">{topic.question}</span></div></div>{topic.prompts.length ? <ol className="prompt-list">{topic.prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ol> : <div className="empty"><strong>No prompt set is configured for this topic</strong></div>}</section>
    <section className="panel page-panel"><div className="panel-head"><span className="panel-title">Evidence history</span><span className="panel-meta">{observations.length} records from Supabase</span></div>{observations.length ? <div className="table-wrap"><table><thead><tr><th>Observed</th><th>Provider</th><th>Check</th><th>Status</th><th>Result</th></tr></thead><tbody>{observations.map((observation) => <tr key={observation.id}><td>{formatDate(observation.observed_at)}</td><td><strong>{providerLabel(observation.provider)}</strong></td><td>{observationLabel(observation.observation_type)}<small>{observation.question}</small></td><td><span className="run-status"><span className={`dot ${observation.status}`} />{statusLabel(observation.status)}</span></td><td>{observation.status === "failed" ? <span className="result-error">{observation.error_message ?? "Provider failed"}</span> : observation.provider === "exa" ? <span className={observation.citation_found ? "result-positive" : "result-muted"}>{observation.citation_found ? "Citation found" : "No citation found"}</span> : <span className="result-positive">Document inspected</span>}</td></tr>)}</tbody></table></div> : <div className="empty"><strong>No evidence has been recorded yet</strong>The topic is configured, but no provider result is available.</div>}</section>
  </ObservatoryShell>;
}
