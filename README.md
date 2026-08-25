# AEO LOOP

Private observatory and automation system for measuring whether controlled topics drive AI-search citations to [stephenmantle.com](https://www.stephenmantle.com), then turning verified evidence into human-approved site improvements.

## What this repository will contain

- Supabase migrations and the evidence data model.
- Server-side collectors for Exa, Firecrawl, and Google Search Console.
- Daily Vercel Cron execution with idempotency and cost tracking.
- A real database-backed Observatory dashboard for runs, citations, observations, and findings.
- Human review and delivery through Linear, Zapier, and Slack.
- GitHub Actions checks before any site change is merged.

The public portfolio site remains a separate surface. It may publish approved insights, but it does not expose the private evidence database.

## Current foundation

The first migration matches the live Supabase project in `mants org`:

- `runs`
- `observations`
- `findings`

See [docs/data-model.md](docs/data-model.md) for the schema, provenance rules, and access boundary.

## Local setup

1. Install the repository dependencies once the project package manifest is added.
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

Database foundation complete. Dashboard, collectors, analysis agent, delivery automations, and CI/CD remain the next implementation layers.
