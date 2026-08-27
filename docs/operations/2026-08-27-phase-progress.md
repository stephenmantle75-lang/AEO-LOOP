# AEO LOOP phase progress — 27 August 2026

This is the current implementation checkpoint after deferring the public/private
Observatory boundary work.

## Completed or locally verifiable

- Phase 0 foundation: dedicated repository, Vercel project, Supabase project,
  environment template, and architecture documentation exist.
- Phase 1 foundation: three controlled answer pages exist with fixed prompts,
  route metadata, and crawlable HTML.
- Phase 2 foundation: Supabase `runs`, `observations`, and `findings` schema;
  protected Vercel Cron route; daily idempotency claim; Firecrawl and bounded
  Exa collection; real records written by the production run.
- Phase 3 foundation: database-backed overview, topic and run views, provider
  health, explicit failed/partial states, and a derived `daily-pulse.v1`
  report preview/detail route. The findings review surface is now present and
  reads persisted findings plus draft-only recommendations from the latest
  stored run. The remaining navigation now has honest review surfaces for
  experiment design, integration health, and the five-layer architecture map;
  these pages do not invent experiment or delivery records.
- Phase 4 first slice: a deterministic evidence-to-finding contract now turns
  stored Firecrawl/Exa observations into review-only technical or citation-gap
  drafts. Drafts retain the exact observation IDs that caused them and cannot
  write to Supabase or trigger Linear, Slack, Zapier, GitHub, or Vercel.
- Phase 5 foundation: GitHub Actions quality gate, dependency review, CodeQL,
  Dependabot configuration, protected-main workflow, Vercel Git deployment,
  and local response-header hardening.

## Current local commits

- Earlier local checkpoint commits documented response headers and the
  reproducible daily-pulse report. That checkpoint is superseded by the
  production `main` deployment at `53b903f`.
- `e9c97e8` adds the evidence-backed Findings review surface and deterministic
  draft analyzer. It is pushed to the feature branch in draft PR #16.
- The follow-up dashboard-surface slice is locally validated and committed
  separately; it is not production and must remain behind the PR review gate.
- `2cf3865` — baseline response headers with report-only CSP.
- `8c7136f` — reproducible daily-pulse report builder, route, overview preview,
  and tests.

Both commits are local only. No push or deployment was performed in this
checkpoint.
- The current findings/reporting implementation is local and unpushed until
  Stephen explicitly approves the next GitHub PR/push.

## Deferred intentionally

- Public/private Observatory access decision and enforcement.
- Raw-provider/error/citation boundary hardening beyond the derived report.
- Slack and Zapier delivery.
- Search Console and privacy-conscious human analytics adapters.
- Persisted report/outbox/delivery tables and Slack/Zapier activation.
- Model-backed analysis-agent findings and experiment orchestration. The
  current deterministic draft analyzer is only the contract and review slice.
- Portfolio redesign and public case-study proof.

The experiment, integration, and architecture pages are explanatory control
plane surfaces only. They do not imply that Search Console, Slack, Zapier, or
model-backed analysis is active.


## Manual gates remaining

1. Review the next fresh daily run in Vercel logs and Supabase. Confirm a new
   run key, Firecrawl target result, Exa result, status, duration, and cost.
2. Confirm the live repository migration history matches the migrations in
   `supabase/migrations/`, especially `claim_daily_run`.
3. Choose the Observatory access model: private operator dashboard or a
   deliberately sanitized public read model.
4. Review and approve the first draft finding in the Observatory before any
   persistence or external delivery capability is enabled.
5. Connect Search Console and analytics only when ready to measure real search
   and human traffic; keep those signals separate from synthetic citations.
6. Approve the first Slack/Zapier test only after a real report is trusted and
   the destination/event idempotency are confirmed.
7. Use the protected GitHub PR path for any push, then verify the Vercel
   preview, production deployment, and follow-up observation before treating a
   site change as an experiment result.
