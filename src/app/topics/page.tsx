import Link from "next/link";
import { ConnectionNotice, ObservatoryShell, PageHeader } from "../_components/observatory-shell";
import { displayUrl, formatDate, getFindingCount, getTopicSummaries } from "@/lib/observatory";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const [topicsResult, findingCount] = await Promise.all([getTopicSummaries(), getFindingCount()]);
  return <ObservatoryShell active="topics" findingCount={findingCount}>
    <PageHeader eyebrow="Observatory / Topics" title="What are we measuring?" description="Each topic is a fixed question set mapped to one public answer page. Results below are read from Supabase." connected={topicsResult.connected} />
    <ConnectionNotice connected={topicsResult.connected} />
    <section className="panel page-panel"><div className="panel-head"><span className="panel-title">Tracked topics</span><span className="panel-meta">{topicsResult.data.length} configured</span></div>{topicsResult.data.length ? <div className="topic-list">{topicsResult.data.map((topic) => <Link className="topic-row topic-row-link" href={`/topics/${topic.key}`} key={topic.key}><div><div className="topic-name">{topic.question}</div><div className="topic-url">{displayUrl(topic.targetUrl)}</div><div className="topic-meta">{topic.promptCount || "No"} prompts · {topic.observationCount} observations · last seen {formatDate(topic.lastObservedAt)}</div></div><div className="topic-score"><strong>{topic.citationChecks ? `${Math.round((topic.citationsFound / topic.citationChecks) * 100)}%` : "—"}</strong><span>citation rate</span></div></Link>)}</div> : <div className="empty"><strong>No topics recorded</strong>Topics will appear after the first real observation is stored.</div>}</section>
    <section className="panel architecture"><div className="panel-title">Topic evidence path</div><div className="flow"><div className="flow-step">Fixed prompt set<br /><small>repeatable input</small></div><div className="arrow">→</div><div className="flow-step">Provider observations<br /><small>Exa + Firecrawl</small></div><div className="arrow">→</div><div className="flow-step">Topic trend<br /><small>stored in Supabase</small></div></div><div className="notice">A topic is not a score by itself. The dashboard keeps the prompt, provider, target, timestamp, and result together so changes can be compared later.</div></section>
  </ObservatoryShell>;
}
