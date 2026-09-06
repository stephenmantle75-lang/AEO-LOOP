# AEO LOOP architecture

## Product boundary

`AEO-LOOP` is the overall AEO Growth Loop product. It owns observation, evidence, analysis, workflow orchestration, dashboard presentation, tests, and deployment automation.

`stephenmantle-web` is the separate public portfolio repository. It owns the human-facing portfolio, answer pages, case studies, conversion paths, robots rules, and sitemap. Approved findings may create a change there, but the portfolio repo is not the evidence database and does not embed the private Observatory.

Supabase is the durable data layer for AEO-LOOP. Vercel is the first hosting and cron target. Cloudflare remains an optional runtime for jobs that outgrow the Vercel function boundary.

## System flow

```text
Public answer page
  → daily Vercel cron
  → Firecrawl / Exa / Search Console / analytics adapters
  → Supabase run and observation records
  → analysis agent
  → evidence-backed finding
  → human review in Observatory
  → Linear issue + Zapier/Slack notification
  → approved GitHub PR and CI
  → portfolio deployment
  → follow-up observation
```

## Five operating layers

The implementation is intentionally understandable as five operational layers,
matching the visual planning reference:

| Layer | AEO LOOP responsibility | First review surface |
|---|---|---|
| Sync | Pull page, search, research, and analytics evidence | Run detail and provider health |
| Sense | Normalize observations and compare repeated runs | Topics and evidence tables |
| Decide | Produce evidence-backed findings and experiment candidates | Findings queue |
| Act | Route approved work into Linear, GitHub, CI, and deployment | Work/release view |
| Report | Summarize health, funnel movement, leaks, and next actions | Overview and `#aeo-growth-loop` |

Slack is in Report and Delivery, not in the database layer. The database
records the report payload and delivery status; Slack presents a concise,
linked view for the operator. See [reporting-contract.md](reporting-contract.md)
for the KPI, funnel, image, and idempotency contract.

## Operating knowledge boundary

The project deliberately separates four kinds of truth:

| Truth | Owner | Why |
|---|---|---|
| Delivery | Linear | Issues, phase status, blockers, dependencies, and accountability |
| Code | GitHub | Branches, pull requests, CI, and review history |
| Runtime | Supabase and Vercel | Stored evidence, deployment state, cron invocations, and logs |
| Knowledge | Repository docs and private Notion control plane | Research, SOPs, templates, architecture, and decision rationale |

The repository-level routine and data boundaries are documented in
[operations/control-plane.md](operations/control-plane.md). The decision to
keep Linear and Notion complementary rather than synchronised bidirectionally
is recorded in
[ADR-0001](decisions/0001-linear-notion-ownership.md).

Private Notion pages may provide richer visual layouts and operating guidance,
but they are not a runtime dependency. The application must remain operable
from the repository, Supabase, Vercel, and Linear records.

## Review surfaces

| Surface | Repository | Purpose |
|---|---|---|
| Portfolio | `stephenmantle-web` | Human-facing work, answer pages, and approved public improvements |
| Observatory | `AEO-LOOP` | Real database-backed runs, evidence, findings, experiments, and failure states |
| Repository | `AEO-LOOP` and `stephenmantle-web` | Code, migrations, tests, workflow, and review history |
| Public case study | Portfolio site or sanitized Observatory route | Explain the system without exposing private evidence or credentials |

## Non-negotiable boundaries

- The service-role key and provider credentials are server-only.
- Raw provider payloads and visitor-level analytics are not public DTOs.
- An agent can recommend or draft work but cannot deploy production changes directly.
- A Linear issue, GitHub PR, CI result, human approval, deployment, and retest form the review chain.
- Synthetic citation observations, Search Console metrics, and human traffic remain separate signals.

## Implementation order

Build vertical slices rather than empty layers:

1. One topic → one page → one manually recorded baseline.
2. One page → Firecrawl/Exa result → Supabase observation.
3. Observation → finding → Observatory detail view.
4. Finding → Linear/Zapier/Slack delivery.
5. Approved finding → GitHub PR → CI → deployment → retest.

## Current implementation slice

The repository currently implements the first production-shaped slice without
claiming a citation win:

```text
Vercel Cron (protected)
  → claim_daily_run() with a Postgres advisory lock
  → Firecrawl page integrity observation
  → bounded Exa citation observations
  → Supabase runs / observations
  → Observatory reads the real records
```

The Observatory overview now reads the latest run and its observation rows from
Supabase. It exposes provider health, citation rate from observed Exa checks,
run duration/cost, target URL, and explicit provider errors. The page performs
no provider calls and never turns a failed observation into a zero.

The Observatory also derives a versioned `daily-pulse.v2` report from stored
run, observation, and finding rows. The overview previews its KPI and funnel;
`/reports/[id]` can reproduce the report from a stored run without calling a
provider again. `/findings` lists persisted findings and shows deterministic,
review-only draft candidates from the latest stored run, each linked to the
observation IDs that caused it. `/experiments` defines the control/variant and
retest contract, `/integrations` makes connector readiness and boundaries
visible, and `/architecture` provides the five-layer system map. Clicks,
engagement, comparison deltas, delivery, and model-backed analysis are shown as
unavailable until their adapters and approval gates exist.

Persisted findings are openable at `/findings/[id]`. That read-only detail view
joins one finding to its source run and exact evidence IDs so a human can
review the basis for a recommendation before any approval or delivery step.

GitHub Actions now provides the CI boundary for this repository: lint,
typecheck, tests, build, dependency audit, dependency review, and CodeQL run on
pull requests and `main`. Vercel remains the CD boundary. See
[ci-cd-security.md](ci-cd-security.md).

Scheduled paired Exa checks use three fixed prompts by default through
`AEO_DAILY_EXA_PROMPTS=3`, bounded to the ten-prompt experiment set. The
single-topic fallback remains `AEO_MAX_EXA_PROMPTS=1`; manual paired runs use
the complete fixed set unless deliberately reduced. Search Console, analysis
findings, Linear/Zapier/Slack, and approved portfolio changes remain separate
slices.

## Current verification hold

The first production-shaped run is stored in Supabase as `partial` because its
Firecrawl observation used the Observatory hostname instead of the public
portfolio target and received HTTP 404. The target configuration is now the
public portfolio Vercel page. A same-day manual retry returned `202` because
`claim_daily_run()` correctly rejected the duplicate daily key, so no fresh
provider call was made.

The next proof point is the 27 August 2026 daily run. It must produce a new
Supabase run and verify Firecrawl against the public page before Slack,
findings, CI/CD, or portfolio changes proceed. See
[the checkpoint record](operations/2026-08-26-verification-checkpoint.md).

## Current gap to the next slice

The next implementation slice is completing the measurement-to-reporting
contract: repeated citation observations, Search Console and analytics
adapters, persisted report payloads, KPI deltas, and delivery status. The
deterministic draft-finding slice is now available for human review, but it is
not yet a model-backed agent and does not persist or deliver recommendations.
Only after that slice is trusted should the app send the first daily pulse to
Slack.
