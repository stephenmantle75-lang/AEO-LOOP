# AEO LOOP

The overall AEO Growth Loop project: a database-backed Observatory, research collectors, analysis agents, workflow integrations, and CI/CD that measure whether useful answer pages on [stephenmantle.com](https://www.stephenmantle.com) are discovered and cited, then turn verified evidence into human-approved site improvements.

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
- unit tests for the topic budget and server-environment fail-closed behavior.

The analysis agent, findings delivery, GitHub Actions quality gate, human-approved PR flow, and final portfolio redesign are intentionally still later phases.

No fake evidence is presented as live performance. Until a real collection run writes rows, the dashboard must show an explicit empty or not-connected state.

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

Database and first collection/dashboard slice complete. Before deployment, verify environment keys, run the test/build checks, then connect this repository to its dedicated Vercel project. Do not point the cron at production until the target page and provider keys are intentionally enabled.
