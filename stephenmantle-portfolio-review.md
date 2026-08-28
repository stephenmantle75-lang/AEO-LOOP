# Stephen Mantle portfolio review

## Scope

- Repository: [stephenmantle-web](https://github.com/stephenmantle75-lang/stephenmantle-web)
- Live site: [stephenmantle.com](https://www.stephenmantle.com)
- Reviewed repository commit: `d57171c`
- Local visual assets reviewed: hero poster, Studio OS screenshot, Excalidraw diagram, portrait

Firecrawl and Exa were attempted for rendered-site extraction. Both connectors returned authentication errors in this session, so the findings below are based on the public site metadata, repository source, repository assets, Vercel configuration, sitemap, and local visual inspection. No claim is made here about metrics that require Search Console, analytics, or a successful Firecrawl run.

---

## Executive verdict

The visual foundation is strong enough to keep. The site has an editorial, systems-minded character with real assets, motion, diagrams, and a clear commercial point of view.

The main problem is positioning and delivery:

> It currently reads as a services studio with a journal. It does not yet read as a portfolio of reviewed work with live proof.

The AEO project should not replace the portfolio. It should become the flagship Work case study that proves how Stephen thinks, builds, measures, and improves a live system.

Recommended direction:

```text
Stephen Mantle portfolio
    ├── Work / selected systems
    │   └── AEO Growth Loop
    ├── Services / what clients can hire
    ├── Journal / thinking and process
    └── About / experience and operating point of view
```

---

## What is already working

### Visual design

- The palette is recognisable: off-white, charcoal, teal, and controlled orange.
- The site uses real motion and visual material rather than empty UI decoration.
- The AI Readiness poster communicates a product-like system clearly.
- The Studio OS screenshot gives the work an operational, real-world feel.
- The Excalidraw diagram proves that explanation and systems thinking are part of the practice.
- The portrait gives the site a human anchor.
- The typography has a deliberate editorial voice rather than default SaaS styling.
- The homepage opening is clear: “Web design and operational systems.”

### Content and interaction

- The homepage starts with a clear business problem rather than a tool list.
- The Services page has a structured inquiry flow.
- The AI Readiness Check is a useful interactive proof piece.
- The Journal content is based on actual systems and workflow decisions.
- The site already has meaningful routes, a sitemap, robots.txt, canonical metadata, and Vercel routing.
- The repository has Dependabot and TruffleHog secret scanning.

### Best existing proof assets

These should become the basis of the portfolio system:

1. AI Readiness Check
2. Studio OS Control Plane
3. Research Agent System
4. Morning Brief and Mail Automation
5. AEO Growth Loop, once built

---

## Highest-priority issues

### P1 — Public routes are client-rendered only

Evidence:

- [src/App.tsx](https://github.com/stephenmantle75-lang/stephenmantle-web/blob/d57171ca4ade656254d90cbbfd3b1aaae4d73f08/src/App.tsx#L1115-L1169) owns routing and updates metadata inside `useEffect`.
- [index.html](https://github.com/stephenmantle75-lang/stephenmantle-web/blob/d57171ca4ade656254d90cbbfd3b1aaae4d73f08/index.html#L1-L40) contains the initial HTML shell and root metadata only.
- [vercel.json](https://github.com/stephenmantle75-lang/stephenmantle-web/blob/d57171ca4ade656254d90cbbfd3b1aaae4d73f08/vercel.json#L11-L13) rewrites every route to `/`.

Impact:

- A crawler that does not execute JavaScript sees the root shell, not the actual project or journal page.
- Page titles, descriptions, canonicals, and body content are applied after JavaScript runs.
- This weakens AEO discoverability and makes individual portfolio pages harder to cite.

Recommendation:

- Move public content to route-level static rendering or SSR.
- Keep interactive pieces such as the diagnostic as React islands/client components.
- Use a framework that can emit real HTML per route: Next.js or Astro with React islands.
- Do not build a second AEO site before fixing the public rendering layer.

### P1 — Unknown routes can become soft 404s

Evidence:

- [vercel.json](https://github.com/stephenmantle75-lang/stephenmantle-web/blob/d57171ca4ade656254d90cbbfd3b1aaae4d73f08/vercel.json#L11-L13) sends every path to `/`.
- [src/App.tsx](https://github.com/stephenmantle75-lang/stephenmantle-web/blob/d57171ca4ade656254d90cbbfd3b1aaae4d73f08/src/App.tsx#L1060-L1088) normalises unknown paths back to `/`.

Impact:

- A missing portfolio slug may return a homepage with a successful response instead of a true 404.
- This creates crawl ambiguity and hides broken links.

Recommendation:

- Add an explicit 404 route.
- Return 404 for unknown paths.
- Add route tests for every sitemap URL and one invalid URL.

### P1 — The AEO loop has nowhere to record traffic yet

The repository search found no visible analytics/event SDK, first-party event endpoint, Search Console integration, database, or experiment ledger.

Impact:

- The current site can display content, but it cannot yet prove which page attracted a visitor or whether a change improved the outcome.

Recommendation:

- Add a privacy-conscious event layer first.
- Record page view, referrer, landing page, outbound click, contact click, GitHub click, and booking click.
- Add Search Console data separately from human analytics.
- Keep crawler visits, citations, search impressions, and human sessions as different metrics.

### P1 — Diagnostic submissions go directly from the browser to a webhook

Evidence:

- [src/App.tsx](https://github.com/stephenmantle75-lang/stephenmantle-web/blob/d57171ca4ade656254d90cbbfd3b1aaae4d73f08/src/App.tsx#L1779-L1828) sends services inquiry data to `VITE_DIAGNOSTIC_WEBHOOK_URL`.
- [src/App.tsx](https://github.com/stephenmantle75-lang/stephenmantle-web/blob/d57171ca4ade656254d90cbbfd3b1aaae4d73f08/src/App.tsx#L2122-L2204) sends names, emails, answers, scores, and raw payloads from the browser.

Impact:

- The endpoint is part of the public JavaScript bundle.
- `no-cors` makes reliable error handling impossible.
- A public endpoint can be spammed unless the receiving service has its own protection.
- Raw diagnostic answers are sent without a server-side validation boundary.

Recommendation:

- Replace direct browser-to-webhook delivery with `/api/diagnostic`.
- Validate the payload server-side.
- Add rate limiting, origin checks, honeypot or turnstile protection, and structured logging.
- Store only the minimum personal data required.
- Return a real success/error response to the browser.

### P1 — Canonical hostname needs one decision

The repository hardcodes `https://stephenmantle.com` in metadata and sitemap. The supplied public URL is `https://www.stephenmantle.com`.

Recommendation:

- Choose one canonical host.
- Redirect the other host permanently.
- Use the same host in `index.html`, runtime metadata, sitemap, Open Graph URLs, JSON-LD, and dashboard links.
- Verify the actual redirect before changing source code.

---

## Portfolio and information architecture

### Current navigation

The current navigation is:

```text
Home · About · Services · Journal
```

That is coherent for a service studio. It is weak for a portfolio because “Where is the work?” is not answered immediately.

### Recommended navigation

```text
Home · Work · Services · Journal · About · Book a call
```

### Work index

The Work page should be the employer/client review surface. Each card should show:

- project name
- one-line problem
- one-line outcome
- role
- stack
- status: live, building, or case study
- visual proof
- route to the full case study

### Recommended work cards

1. **AEO Growth Loop**
   - A live portfolio site that measures whether its answers are discovered, cited, and visited.
   - Stack: React/Next.js or Astro, Postgres, Firecrawl, Exa, Search Console, GitHub Actions, Linear, Slack.

2. **AI Readiness Check**
   - An interactive diagnostic that converts operational friction into a first workflow recommendation.
   - Stack: React, scoring logic, webhook/email handoff, booking flow.

3. **Studio OS Control Plane**
   - A documented operating layer for AI agents, projects, evidence, and approvals.
   - Use the existing journal entry and Studio OS screenshot as proof.

4. **Research Agent System**
   - A recurring research workflow that turns sources into structured insight.

5. **Morning Brief and Mail Automation**
   - A working automation that reduces manual inbox and reporting work.

---

## AEO as a flagship portfolio case study

The AEO project should live at:

```text
/work/aeo-growth-loop
```

The dashboard can live inside the project:

```text
/work/aeo-growth-loop/observatory
```

Do not make the dashboard the homepage. A recruiter should first understand the work, then choose to inspect the machine.

### Case study layout

1. **Opening**
   - “I built a website that measures whether its answers are being found and cited.”

2. **The problem**
   - A portfolio can look finished without showing how it earns attention or improves.

3. **The experiment**
   - Three topic pages, fixed prompts, baseline, changes, retest.

4. **The live result**
   - Current topic/page/citation/traffic snapshot.

5. **The operating loop**
   - Collection → evidence → finding → Linear issue → GitHub PR → CI → approval → deployment → retest.

6. **The technical architecture**
   - Visual diagram plus plain-language explanation.

7. **The repository**
   - Link to source, schema, workflows, tests, and agent contracts.

8. **The limitations**
   - Citation results vary by provider, query, time, geography, and index state.
   - No automated system can guarantee citation or traffic.

9. **The next experiment**
   - A visible “what the system is testing next” section.

---

## Visual direction to preserve

### Keep

- Editorial headline typography
- Warm light canvas with charcoal sections
- Teal as the core brand accent
- Orange as a controlled signal/action colour
- Real diagrams and screen captures
- Short, calm motion
- Large section numbers and clear rhythm
- Human portrait and first-person writing

### Change

- Use the current shader as a hero accent, not as the main product identity.
- Add real work thumbnails to the Work index.
- Use more outcome-led labels and fewer service-only labels.
- Make each case study visually distinct but recognisably part of one system.
- Add a visible “live / building / case study” status system.
- Keep dashboards inside project pages rather than making the whole site feel like admin software.

### Design read

Solo operator portfolio for hiring managers and prospective clients, with an editorial systems language: warm, precise, visual, and proof-led. The target is not generic AI-creator aesthetics or a dashboard cockpit.

---

## Codebase review

### Architecture

The current app is a Vite React SPA with a manually maintained router and a single [4,567-line `src/App.tsx`](https://github.com/stephenmantle75-lang/stephenmantle-web/blob/d57171ca4ade656254d90cbbfd3b1aaae4d73f08/src/App.tsx).

The file currently contains:

- route definitions
- route metadata
- all content data
- diagnostic scoring
- services inquiry state
- blog content
- page layout
- navigation
- footer
- shader presentation
- form submission logic
- case-study rendering

This is workable for a small site. It is the main scaling constraint for the AEO layer.

### Recommended decomposition

```text
src/
├── content/
│   ├── work.ts
│   ├── journal.ts
│   ├── services.ts
│   └── site.ts
├── components/
│   ├── layout/
│   ├── navigation/
│   ├── portfolio/
│   ├── journal/
│   └── diagnostic/
├── features/
│   ├── aeo-case-study/
│   ├── diagnostic/
│   └── inquiry/
├── server/
│   ├── analytics/
│   ├── diagnostic/
│   └── metadata/
├── routes/
└── styles/
```

Do not split the file mechanically. Extract one vertical slice at a time, beginning with Work and AEO case-study content.

### Repository professionalism

The package is still named `axion-studio`, while the repository is `stephenmantle-web`. Rename it to a clear public project name before presenting the repository as a portfolio piece.

The repository has no visible README in the current checkout. Add one that explains:

- what the site is
- what is live
- the architecture
- the route map
- the interactive diagnostic
- the AEO project
- how CI works
- how to run it locally
- what remains private

### Verification gap

`package.json` currently exposes `dev`, `build`, `preview`, and Remotion rendering scripts, but no test, lint, typecheck, or accessibility scripts.

The only GitHub workflow currently visible is the TruffleHog secret scan. Dependabot is configured, which is good, but the repository does not yet demonstrate a complete CI/CD quality gate.

Add, in order:

1. `typecheck`
2. `lint`
3. `test`
4. `build`
5. accessibility check
6. link check
7. secret scan
8. preview deployment check

The build could not be verified in this review because dependencies are not installed locally and the package registry was unreachable. No dependency installation was approved.

---

## SEO and AEO readiness

### Good foundations

- HTTPS public site
- robots.txt present
- sitemap present
- canonical metadata present in the root shell
- route metadata model exists
- real HTML links are used in blog rows
- image alt text is generally present
- content has useful first-person experience

### Required before AEO experiments

1. Emit route-specific HTML.
2. Add stable route-specific title and description output.
3. Add JSON-LD for `Person`, `WebSite`, `Article`, and `BreadcrumbList` where appropriate.
4. Add author and update metadata to journal and insight pages.
5. Add visible internal links between Work, Journal, Services, and About.
6. Add a clear topic/page map for AEO experiments.
7. Add analytics events and Search Console ingestion.
8. Add a server-side content and citation evidence store.
9. Add a public change log for completed experiments.

Google’s current guidance says AI search still depends on crawlable, indexable content and strong search fundamentals. The current client-only route architecture is therefore the first technical constraint to remove. [Google AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

---

## Recommended build order

### Step 1 — Portfolio IA

- Add Work to the main navigation.
- Create Work index.
- Reframe Services as hireable capabilities.
- Keep Journal as thinking/process.
- Add the AEO project as the first flagship case study.

### Step 2 — Rendering foundation

- Choose Next.js or Astro with React islands.
- Pre-render public Work, Journal, About, and Services pages.
- Preserve the diagnostic as interactive client code.
- Add true 404 handling.
- Standardise the canonical hostname.

### Step 3 — Proof system

- Add analytics events.
- Add Search Console ingestion.
- Add the first three AEO topics.
- Add Firecrawl and Exa provider adapters server-side.
- Store every run and result in Postgres.

### Step 4 — Observatory

- Add `/work/aeo-growth-loop/observatory`.
- Show topic, page, evidence, citations, traffic, and experiment status.
- Add public-safe data views.
- Keep raw provider payloads private.

### Step 5 — Agent workflow

- Findings become Linear issues.
- Slack receives the daily pulse.
- Approved findings become draft GitHub PRs.
- CI checks content, links, schema, accessibility, and build health.

### Step 6 — Portfolio polish

- Add before/after case-study views.
- Add real outcome evidence.
- Add testimonials or reviews only where permission exists.
- Add a public experiment timeline.
- Add a “what is automated / what stays human” section.

---

## Definition of a good public portfolio visit

Within three minutes, a visitor should understand:

1. What Stephen builds.
2. Who the work is for.
3. Which projects are real and live.
4. What Stephen personally did.
5. What tools and systems were used.
6. What changed because of the work.
7. How the AEO project improves the site.
8. Where the public code lives.
9. How to contact or book Stephen.

The AEO project should make the portfolio more credible, not make the portfolio feel like an internal operations dashboard.

