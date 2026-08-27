# AEO LOOP

The overall AEO Growth Loop project: a database-backed Observatory, research collectors, analysis agents, workflow integrations, and CI/CD that measure whether useful answer pages on the public portfolio app are discovered and cited, then turn verified evidence into human-approved site improvements.

## What this repository contains and will contain

- Supabase migrations and the evidence data model.
- Server-side collectors for Exa, Firecrawl, and Google Search Console.
- Daily Vercel Cron execution with idempotency and cost tracking.
- A real database-backed Observatory dashboard for runs, citations, observations, and findings.
- Human review and delivery through Linear, Zapier, and Slack.
- GitHub Actions checks before any site change is merged.

This is the overall system repository, not a Supabase-only repository. Supabase is the database layer inside this project.

The public portfolio site remains a separate repository: `stephenmantle-web`. It receives approved content or code changes from this loop, but it does not expose the private evidence database.

## Architecture

```text
stephenmantle-web
  → public answer pages and portfolio conversions
  → AEO-LOOP collectors and Vercel cron
  → Supabase runs / observations / findings
  → Observatory dashboard and analysis agents
  → Linear / Zapier / Slack
  → human-approved GitHub PR
  → portfolio deployment and follow-up measurement
```

The Observatory is a separately hosted app built from this repository. It is not a page embedded in the public portfolio.

## Current foundation

The first migration matches the live Supabase project in `mants org`:

- `runs`
- `observations`
- `findings`

See [docs/data-model.md](docs/data-model.md) for the schema, provenance rules, and access boundary.

## Current implementation status

The database contract is live and the first application vertical slice is now present:

- a server-only Next.js/Vercel app shell with a real Supabase dashboard query;
- a protected daily cron route at `/api/cron/daily-observation`;
- one-topic Firecrawl page-integrity and bounded Exa citation collection;
- idempotent daily run claims serialized by a Postgres advisory lock;
- a real-data overview showing the latest run, provider health, citation rate,
  cost, and evidence rows from Supabase;
- a derived `daily-pulse.v1` report preview and `/reports/[id]` route that
  rebuilds KPI and funnel state from a stored run without recalling providers;
- a `/findings` review surface that lists persisted findings and derives
  evidence-linked, draft-only recommendations from the latest stored run;
- unit tests for the topic budget and server-environment fail-closed behavior.
- GitHub Actions quality, dependency, and CodeQL workflows for pull requests
  and `main`.

The model-backed analysis agent, findings persistence/delivery, human-approved
PR flow, and final portfolio redesign are intentionally still later phases.
The report route is currently a derived review artifact, and draft findings are
review-only; Slack/Zapier delivery, Search Console, human analytics, report
persistence, and the public/private Observatory access decision remain
deferred.

See [docs/ci-cd-security.md](docs/ci-cd-security.md) for the CI/CD flow,
required GitHub settings, and secret boundary.

The current verification hold is documented in
[docs/operations/2026-08-26-verification-checkpoint.md](docs/operations/2026-08-26-verification-checkpoint.md),
with the next phase audit in
[docs/operations/2026-08-27-phase-progress.md](docs/operations/2026-08-27-phase-progress.md).
The next fresh daily collection is scheduled for 27 August 2026. A manual
retry on 26 August returned `202` because the daily run key already existed;
it did not create another provider collection.

No fake evidence is presented as live performance. Until a real collection run writes rows, the dashboard must show an explicit empty or not-connected state.

The reporting contract for Mode B is documented in
[docs/reporting-contract.md](docs/reporting-contract.md). It defines the daily
Slack pulse, KPI dictionary, funnel/biggest-leak view, sanitized visual
artifacts, and delivery idempotency. Slack is a reporting and operator surface;
Supabase remains the source of truth.

## Local setup

1. Install the repository dependencies with `pnpm install`.
2. Copy `.env.example` to `.env` and fill in values locally. Never commit `.env`.
3. Use the Supabase CLI to run the migrations against a local database or the approved project.
4. Run the test suite before opening a pull request.

The first implementation deliberately does not seed fake observations. The dashboard should show an honest empty state until the first real collection run succeeds.

## System flow

```text
Daily Cron -> collectors -> Supabase evidence -> analysis agent
    -> findings -> human review -> Linear / Slack -> approved PR
    -> public site update -> next observation and retest
```

## Security boundary

Only server-side jobs and dashboard routes may use `SUPABASE_SERVICE_ROLE_KEY`. Browser code must use neither the service role key nor raw provider credentials. Scheduled endpoints must validate `CRON_SECRET`.

## Status

Database, deployment, and first collection/dashboard slice are live. The next
proof point is a fresh daily run against the public portfolio Vercel page. The
portfolio site remains unchanged while this verification hold is open.
