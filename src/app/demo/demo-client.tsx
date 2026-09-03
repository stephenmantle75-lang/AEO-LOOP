"use client";

import { useState } from "react";

type DemoState = "ready" | "running" | "complete" | "approved";

const stages = [
  { key: "question", number: "01", name: "Question", tool: "Human intent", detail: "A fixed question keeps the comparison honest." },
  { key: "page", number: "02", name: "Page check", tool: "Firecrawl", detail: "The live answer page is fetched and its structure is inspected." },
  { key: "citation", number: "03", name: "Citation check", tool: "Exa", detail: "A separate search signal checks whether the page is returned as a source." },
  { key: "evidence", number: "04", name: "Evidence", tool: "Supabase", detail: "Provider output is normalized into a durable observation record." },
  { key: "decision", number: "05", name: "Decision", tool: "Human review", detail: "A recommendation is prepared. Nothing changes without approval." },
] as const;

const question = "What is the difference between SEO and AEO for a personal portfolio?";

export function DemoClient() {
  const [state, setState] = useState<DemoState>("ready");
  const [activeStage, setActiveStage] = useState(0);

  const runDemo = () => {
    setState("running");
    setActiveStage(0);
    stages.slice(1).forEach((_, index) => {
      window.setTimeout(() => setActiveStage(index + 1), 520 * (index + 1));
    });
    window.setTimeout(() => setState("complete"), 520 * stages.length + 180);
  };

  const approve = () => setState("approved");
  const reset = () => {
    setState("ready");
    setActiveStage(0);
  };

  const isFinished = state === "complete" || state === "approved";

  return <div className="demo-page">
    <section className="demo-hero">
      <div className="demo-hero-copy">
        <span className="demo-kicker">The live story</span>
        <h2>Most teams can see the answer. Few can show how they got there.</h2>
        <p>Ask one question. Observe the public page. Test the citation signal. Store the evidence. Let a person decide what happens next.</p>
        <div className="demo-hero-meta"><span><i className="demo-pulse" /> deterministic walkthrough</span><span>no provider cost</span><span>human approval required</span></div>
      </div>
      <div className="demo-question-card">
        <div className="demo-card-top"><span>Question under observation</span><span className="demo-lock">read-only</span></div>
        <p>{question}</p>
        <div className="demo-target"><span className="demo-target-dot" /> https://www.stephenmantle.com/insights/seo-vs-aeo-portfolio</div>
        <button className="primary-button demo-run-button" onClick={runDemo} disabled={state === "running"}>
          {state === "running" ? "Running observation…" : isFinished ? "Run again" : "Run the observation"}
        </button>
      </div>
    </section>

    <section className="demo-flow-panel" aria-labelledby="demo-flow-title">
      <div className="demo-section-heading"><div><span className="eyebrow">Flow view</span><h2 id="demo-flow-title">From intent to accountable action</h2></div><span className={`demo-state demo-state-${state}`}>{state === "ready" ? "Ready" : state === "running" ? "Collecting" : state === "complete" ? "Finding ready" : "Approved in demo"}</span></div>
      <div className="demo-flow" role="list">
        {stages.map((stage, index) => <div className={`demo-stage ${index < activeStage || isFinished ? "is-done" : ""} ${index === activeStage && state === "running" ? "is-active" : ""}`} key={stage.key} role="listitem">
          <div className="demo-stage-number">{index < activeStage || isFinished ? "✓" : stage.number}</div>
          <div><strong>{stage.name}</strong><span>{stage.tool}</span></div>
          {index < stages.length - 1 && <div className="demo-stage-connector" aria-hidden="true" />}
        </div>)}
      </div>
    </section>

    <section className="demo-results-grid" aria-live="polite">
      <div className="panel demo-evidence-panel">
        <div className="panel-head"><span className="panel-title">Evidence captured</span><span className="panel-meta">run demo-2026-09-03</span></div>
        <div className="demo-evidence-list">
          <article className={`demo-evidence-row ${activeStage >= 1 || isFinished ? "is-visible" : ""}`}><span className="demo-icon demo-icon-firecrawl">↗</span><div><strong>Page integrity</strong><p>Document inspected. Canonical URL and answer structure available.</p></div><span className="demo-result">observed</span></article>
          <article className={`demo-evidence-row ${activeStage >= 2 || isFinished ? "is-visible" : ""}`}><span className="demo-icon demo-icon-exa">⌕</span><div><strong>Citation check</strong><p>The target page was not returned for this prompt.</p></div><span className="demo-result demo-result-muted">no citation</span></article>
          <article className={`demo-evidence-row ${activeStage >= 3 || isFinished ? "is-visible" : ""}`}><span className="demo-icon demo-icon-supabase">▣</span><div><strong>Stored observation</strong><p>Provider results normalized with status, URL, and timestamp.</p></div><span className="demo-result">persisted</span></article>
        </div>
      </div>

      <div className="panel demo-decision-panel">
        <div className="panel-head"><span className="panel-title">Human decision boundary</span><span className="panel-meta">no automatic deploy</span></div>
        <div className="demo-decision-copy">
          <span className="demo-decision-icon">!</span>
          <div><span className="eyebrow">Finding detected</span><h3>The answer page is healthy, but not yet cited.</h3><p>Recommendation: strengthen the direct answer route before the next comparison window.</p></div>
        </div>
        <div className="demo-decision-actions">
          <button className="primary-button" onClick={approve} disabled={!isFinished || state === "approved"}>{state === "approved" ? "Approved for next step" : "Approve recommendation"}</button>
          <button className="secondary-button" onClick={reset}>Reset demo</button>
        </div>
        <p className="demo-disclaimer">This is a safe event walkthrough. Approval changes only the demo state; the real AEO LOOP sends findings to a review surface before any work is created.</p>
      </div>
    </section>

    <section className="demo-explain" aria-label="Demo explanation">
      <div><span className="eyebrow">Why this matters</span><h2>AI can act quickly. The system still needs a memory.</h2></div>
      <div className="demo-explain-copy"><p>AEO LOOP joins the tools that normally sit apart: a crawler sees the page, a search provider sees the citation signal, Supabase keeps the evidence, and the review layer keeps a human in control.</p><div className="demo-architecture-line"><span>Question</span><b>→</b><span>Providers</span><b>→</b><span>Supabase</span><b>→</b><span>Review</span></div></div>
    </section>
  </div>;
}
