"use client";

import Link from "next/link";
import { useState } from "react";
import type { FindingRow, ObservationRow, ReportDeliveryStatus, RunRow } from "@/lib/observatory";

type DemoClientProps = {
  connected: boolean;
  delivery: ReportDeliveryStatus | null;
  finding: FindingRow | null;
  observations: ObservationRow[];
  run: RunRow | null;
};

type DemoState = "ready" | "replaying" | "complete";

const stages = [
  { key: "question", number: "01", name: "Question", tool: "Human intent" },
  { key: "page", number: "02", name: "Page check", tool: "Firecrawl" },
  { key: "citation", number: "03", name: "Citation check", tool: "Exa" },
  { key: "evidence", number: "04", name: "Evidence", tool: "Supabase" },
  { key: "decision", number: "05", name: "Decision", tool: "Review layer" },
] as const;

function shortId(value: string): string {
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function displayUrl(value: string | null): string {
  return value?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "Target not recorded";
}

function statusText(value: string): string {
  return value.replaceAll("_", " ");
}

function providerLabel(value: string): string {
  return value === "firecrawl" ? "Firecrawl" : value === "exa" ? "Exa" : value;
}

export function DemoClient({ connected, delivery, finding, observations, run }: DemoClientProps) {
  const [state, setState] = useState<DemoState>("ready");
  const [activeStage, setActiveStage] = useState(0);
  const firecrawl = observations.find((item) => item.provider === "firecrawl") ?? null;
  const exa = observations.find((item) => item.provider === "exa") ?? null;
  const targetUrl = firecrawl?.target_url ?? exa?.target_url ?? null;
  const hasRun = Boolean(run);
  const replayFinished = state === "complete";

  const replay = () => {
    if (!run) return;
    setState("replaying");
    setActiveStage(0);
    stages.slice(1).forEach((_, index) => window.setTimeout(() => setActiveStage(index + 1), 560 * (index + 1)));
    window.setTimeout(() => setState("complete"), 560 * stages.length + 160);
  };

  const reset = () => {
    setState("ready");
    setActiveStage(0);
  };

  return <div className="demo-page">
    <section className="demo-hero demo-hero-live">
      <div className="demo-hero-copy">
        <span className="demo-kicker">Production replay</span>
        <h2>This is not a dashboard tour. It is the run behind the dashboard.</h2>
        <p>Replay the latest stored run and show the audience what actually moved: the question, the provider calls, the evidence rows, and the review boundary.</p>
        <div className="demo-hero-meta"><span><i className="demo-pulse" /> {connected ? "supabase source of truth" : "supabase unavailable"}</span><span>{run ? statusText(run.status) : "no run"}</span><span>{observations.length} evidence rows</span></div>
      </div>
      <div className="demo-run-card">
        <div className="demo-card-top"><span>Latest production run</span><span className={`demo-live-badge ${run?.status === "succeeded" ? "is-good" : ""}`}>{run?.status ?? "not found"}</span></div>
        {run ? <><h3>{run.run_key}</h3><div className="demo-run-details"><span>Run ID <code>{shortId(run.id)}</code></span><span>Started {new Date(run.started_at).toLocaleString()}</span><span>{run.cost_usd == null ? "Cost not recorded" : `$${Number(run.cost_usd).toFixed(3)} provider cost`}</span></div><div className="demo-target"><span className="demo-target-dot" /> {displayUrl(targetUrl)}</div></> : <div className="demo-empty-run">No production run is available. Open the Observatory after the first protected cron run.</div>}
        <button className="primary-button demo-run-button" onClick={replay} disabled={!hasRun || state === "replaying"}>{state === "replaying" ? "Replaying real run…" : replayFinished ? "Replay again" : "Replay latest run"}</button>
      </div>
    </section>

    <section className="demo-flow-panel" aria-labelledby="demo-flow-title">
      <div className="demo-section-heading"><div><span className="eyebrow">Flow view</span><h2 id="demo-flow-title">One run. Five accountable handoffs.</h2></div><span className={`demo-state demo-state-${state}`}>{state === "ready" ? "Ready to replay" : state === "replaying" ? "Reading stored run" : "Production run replayed"}</span></div>
      <div className="demo-flow" role="list">
        {stages.map((stage, index) => <div className={`demo-stage ${index < activeStage || replayFinished ? "is-done" : ""} ${index === activeStage && state === "replaying" ? "is-active" : ""}`} key={stage.key} role="listitem">
          <div className="demo-stage-number">{index < activeStage || replayFinished ? "✓" : stage.number}</div>
          <div><strong>{stage.name}</strong><span>{stage.tool}</span></div>
          {index < stages.length - 1 && <div className="demo-stage-connector" aria-hidden="true" />}
        </div>)}
      </div>
      <div className="demo-flow-proof"><span>What this proves</span><p>The dashboard is only the review surface. These are the real records and systems connected underneath it.</p></div>
    </section>

    <section className="demo-results-grid" aria-live="polite">
      <div className="panel demo-evidence-panel">
        <div className="panel-head"><span className="panel-title">Actual provider evidence</span><span className="panel-meta">{run ? `run ${shortId(run.id)}` : "no run"}</span></div>
        <div className="demo-evidence-list">
          {observations.length ? observations.map((observation) => <article className={`demo-evidence-row ${activeStage >= 1 || replayFinished ? "is-visible" : ""}`} key={observation.id}><span className={`demo-icon demo-icon-${observation.provider}`}>{observation.provider === "firecrawl" ? "↗" : "⌕"}</span><div><strong>{providerLabel(observation.provider)} · {observation.observation_type.replaceAll("_", " ")}</strong><p>{observation.status === "failed" ? observation.error_message ?? "Provider failed; inspect logs." : observation.provider === "exa" ? observation.citation_found ? "Target page returned as a citation." : "Target page not returned as a citation." : "Target page inspected successfully."}</p><small>{displayUrl(observation.target_url)}</small></div><span className={`demo-result ${observation.status === "failed" ? "demo-result-error" : observation.citation_found ? "" : "demo-result-muted"}`}>{observation.status === "failed" ? "failed" : observation.provider === "exa" && !observation.citation_found ? "no citation" : observation.status}</span></article>) : <div className="empty"><strong>No stored observations</strong>Run the protected daily observation before presenting this page.</div>}
        </div>
      </div>

      <div className="panel demo-decision-panel">
        <div className="panel-head"><span className="panel-title">Review boundary</span><span className="panel-meta">human-controlled</span></div>
        <div className="demo-decision-copy">
          <span className="demo-decision-icon">!</span>
          <div><span className="eyebrow">What happens next</span><h3>{finding ? finding.title : "Evidence becomes a reviewable finding."}</h3><p>{finding ? finding.recommendation : "A finding links the observation IDs to a recommendation. A person reviews it before Linear, GitHub, or the public site changes."}</p></div>
        </div>
        <div className="demo-proof-list"><div><span>Finding record</span><strong>{finding ? finding.status : "not generated"}</strong></div><div><span>Slack delivery</span><strong>{delivery?.status ?? "not generated"}</strong></div><div><span>Automatic deploy</span><strong>blocked by design</strong></div></div>
        <div className="demo-decision-actions">{run && <Link className="primary-button" href={`/runs/${run.id}`}>Open raw run</Link>}<Link className="secondary-button" href="/findings">Open findings</Link></div>
        <p className="demo-disclaimer">This surface does not invent a success story. It reads stored production output and leaves the final action with a human.</p>
      </div>
    </section>

    <section className="demo-explain" aria-label="Demo explanation">
      <div><span className="eyebrow">Architecture view</span><h2>Working software is the point.</h2></div>
      <div className="demo-explain-copy"><p>Firecrawl inspects the live page. Exa tests whether an answer engine returns it as a source. Supabase stores the run and observation rows. The Observatory reads those records. Review and delivery remain separate from collection.</p><div className="demo-architecture-line"><span>Vercel Cron</span><b>→</b><span>Firecrawl + Exa</span><b>→</b><span>Supabase</span><b>→</b><span>Review + Slack</span></div></div>
    </section>
  </div>;
}
