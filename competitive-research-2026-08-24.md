# AEO Growth Loop — competitive research

Date: 2026-08-24. Three parallel research agents. Firecrawl + web search + `gh` CLI.
**Exa was unavailable (401) — this research ran without it.**

## Bottom line

The idea is not novel. The *specific* gap is real but much narrower than the plan assumes.

| Layer | Status |
|---|---|
| Measuring AI citations | **Commodity.** ~15 open-source trackers, 40+ commercial products, entry price $29–99/mo |
| Public AEO dashboard | **Commodity.** HubSpot ships one free, no login, since 2026-05-14 |
| Postgres evidence store + Firecrawl/Exa adapters | **Commodity.** Canonry, Elmo, habibi, geo-aeo-tracker all do this |
| Closed loop (detect → change → re-measure) | **Exists commercially.** Profound ships "Closed-Loop Optimization", $1B valuation |
| Loop routed through issue tracking + version control + code review | **UNOCCUPIED.** This is the differentiator |

## Category state

- **Consolidated fast:** Adobe/Semrush $1.9B (closed 2026-04-28), Sitecore/Scrunch ~$225M (2026-06-03)
- **Leader:** Profound, $96M Series C @ $1B (2026-02-24), >$155M total
- Standalone monitoring commoditising to $29–99/mo; value migrating to the execution layer

## Open source

- `Canonry/canonry` — 121★, active. Functionally this plan. **FSL-1.1-ALv2 = source-available, NOT open source.** Read for orientation, do not lift code or schema. Uses SQLite.
- `elmohq/elmo` — 260★, MIT, Postgres. Best-run repo. README has a numbered measurement methodology + an honest table of where closed rivals beat it. Imitate that honesty.
- ~15 live trackers total. **Star counts are not a quality signal** — several 700–1,200★ repos are skill bundles with a Product Hunt badge; the two best-built have 121 and 101.
- **Thinnest component = AI-crawler log analysis.** Everything is 1–4★ and weeks old. Highest-value piece to own. Verify crawlers by IP, not user-agent.

## Tactics that are measured-null — do not lead with these

- **llms.txt** — Google confirmed no ranking impact 2026-06-15. Server logs show crawlers don't request the file.
- **Markdown-for-bots** — Profound A/B: 381 pages, 6 sites, ~1 extra median bot visit over 3 weeks = noise.
- **Schema as silver bullet** — Google's 2026-05-15 guidance says no special markup needed.

## The likely outcome is zero citations

- 67% of citations in a topic go to ~30 domains (Reddit, Wikipedia, LinkedIn, YouTube, publishers)
- A solo blogger tested 3 prompts × 3 engines on his own topic: cited zero times
- Citation decay: only 119 of 1,127 tracked URLs still cited six weeks later
- AI referrals ≈ 1.08% of all referral traffic (Conductor's own 2026 benchmark)

**A brand-new personal domain is structurally disadvantaged. Plan for the null result.**

## Attention follows the finding, not the build

| Published | Outcome |
|---|---|
| Robb Knight — own server logs proved Perplexity disguised its user agent | #1 Hacker News → WIRED investigation |
| John (Indie Hackers) — measured own citation rate, found it lower than expected | 22 likes, 49 comments, 8,000 tool runs |
| AskAiRank — competent honest tool launch, no finding | **1 like, 0 comments** |
| LoopLad — agent rewrites site every 2h, no measurement, no gate | public counter reads "streak: 1 day" |

## Hiring precedent (n=1, verified)

**santifer/career-ops** — Business Insider 2026-04-28. 740 listings → 68 applications → 12 processes → 1 offer (Head of Applied AI). 63.5K★.

**Critical detail: the repo was PRIVATE the whole time he was job-hunting.** Published after signing. Virality was a consequence of the hire, not the cause. Lesson is about sequencing — prove it running on yourself first — not about repo visibility.

No second case found. Searches returned only content-marketing listicles.

## Reproducibility — the strongest technical angle

Independent testing (codeless.io, 2026-03) of Peec AI / SE Visible / AthenaHQ / Otterly:
- Same brand, same prompt, three runs: **0%, 33%, 67%**
- Sentiment 0 / 50 / 100 across three tests while visibility stayed pinned at 100
- Tools reported positions contradicting the LLM's own output **25% of the time**
- No vendor in the category reports a confidence interval

Corroborated independently by an indie founder (single checks worthless, must sample over 2–3 weeks) and by the six-week decay data.

**Never publish a single-shot citation number.** Sample N times, store raw responses, report a rate.

## Three changes to the plan

1. **Reframe.** The measurement is the input, not the product. The reviewed-PR list is the demo. Lead with the loop, not the Observatory.
2. **Commit now to publishing the negative result.** Decide before starting that "measured honestly for 12 weeks, answer was no" ships.
3. **Sample, never single-shot.** Confirmed from three independent directions.

## Craft patterns worth stealing (this is what a reviewer actually judges)

- `docs/architecture.md` + `docs/data-model.md` with a mermaid ERD naming the schema file (Canonry). Highest leverage, lowest effort.
- A CI job enforcing the public/private boundary (GEORank `public-boundary.yml`, ~20 lines). Pin Actions to commit SHAs, not tags.
- A conformance CI job running your own tool against a fixture site and asserting the output (dualmark).
- `.env.example` + `SECURITY.md` + secret-scan job — only 1 of 5 leading repos ships an `.env.example`. Cheap way to be above the field.
- Encode every failure back into the system as a rule, published as a changelog.
- Write the case study yourself. The one AI-written case study found reads promotional and undercuts its own receipts.
