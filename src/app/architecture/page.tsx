import Link from "next/link";
import { ObservatoryShell, PageHeader } from "../_components/observatory-shell";

export default function ArchitecturePage() {
  const layers = [
    { number: "01", name: "Sync", title: "Pull the world in", copy: "A protected Vercel Cron route calls the selected providers and records one bounded run.", items: ["daily-observation", "Firecrawl", "Exa", "Supabase"] },
    { number: "02", name: "Sense", title: "Normalize what happened", copy: "Provider responses become comparable observation rows with status, timestamp, target, and evidence.", items: ["runs", "observations", "provider health", "cost"] },
    { number: "03", name: "Decide", title: "Pick the next move", copy: "Evidence-linked drafts identify a technical failure or citation gap without changing production.", items: ["findings", "confidence", "experiment contract", "human review"] },
    { number: "04", name: "Act", title: "Ship through a gate", copy: "An approved change becomes a GitHub PR, passes CI, receives a preview, and waits for release approval.", items: ["Linear", "GitHub", "CI", "Vercel Preview"] },
    { number: "05", name: "Report", title: "Close the loop", copy: "The next run compares the same measurement slice. Slack will summarize the stored report after delivery is enabled.", items: ["daily pulse", "Slack", "retest", "public proof"] },
  ];

  return <ObservatoryShell active="architecture">
    <PageHeader eyebrow="Observatory / Architecture" title="Five layers, one reviewable loop" description="The system map explains what runs, where evidence is stored, who approves change, and how the next measurement closes the loop." statusTone="neutral" statusText="System map" />

    <section className="architecture-hero"><div className="architecture-kicker">AEO LOOP CONTROL PLANE</div><h2>Evidence moves forward only when the boundary is clear.</h2><p>The dashboard is the review surface for the engineering system. The public portfolio remains a separate repository and changes only through an approved release.</p></section>

    <section className="layer-grid" aria-label="Five operating layers">{layers.map((layer) => <article className="layer-card" key={layer.number}><div className="layer-number">{layer.number} · {layer.name}</div><h2>{layer.title}</h2><p>{layer.copy}</p><div className="layer-items">{layer.items.map((item) => <code key={item}>{item}</code>)}</div></article>)}</section>

    <section className="panel architecture"><div className="panel-title">End-to-end path</div><div className="system-path"><span>Public answer page</span><b>→</b><span>Vercel Cron</span><b>→</b><span>Providers</span><b>→</b><span>Supabase</span><b>→</b><span>Findings</span><b>→</b><span>Human-approved PR</span><b>→</b><span>Retest</span></div><div className="notice">This map is a human explanation of the implementation. Runtime numbers belong on Overview, Runs, Topics, and Findings; this page never substitutes a diagram for evidence.</div></section>

    <section className="content-grid"><div className="panel panel-pad"><div className="panel-head panel-head-tight"><span className="panel-title">Where to inspect the system</span><span className="panel-meta">review guide</span></div><div className="review-links"><Link href="/">Overview <span>current health and latest evidence →</span></Link><Link href="/runs">Runs <span>exact run ledger and provider outputs →</span></Link><Link href="/findings">Findings <span>persisted findings and draft recommendations →</span></Link><Link href="/experiments">Experiments <span>control, variant, and retest contract →</span></Link></div></div><div className="panel panel-pad"><div className="panel-head panel-head-tight"><span className="panel-title">Repository locations</span><span className="panel-meta">source code</span></div><div className="review-links"><Link href="/architecture"><code>src/app</code><span>dashboard routes and review surfaces →</span></Link><Link href="/architecture"><code>src/lib/collectors.ts</code><span>provider adapters and normalization →</span></Link><Link href="/architecture"><code>src/lib/reporting.ts</code><span>sanitized daily pulse derivation →</span></Link><Link href="/architecture"><code>src/</code><span>application source; repository docs explain the contracts →</span></Link></div></div></section>
  </ObservatoryShell>;
}
