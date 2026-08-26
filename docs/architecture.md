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

The first Exa run is deliberately capped at one fixed prompt with
`AEO_MAX_EXA_PROMPTS=1`. Increase that only after checking the stored cost and
response quality. Search Console, analysis findings, Linear/Zapier/Slack, and
approved portfolio changes remain separate slices.
