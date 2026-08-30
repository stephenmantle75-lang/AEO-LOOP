# AEO LOOP phase progress — 29 August 2026 local checkpoint

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
- Phase 3 review refinement: persisted findings are now openable at
  `/findings/[id]`, where a reviewer can inspect the finding brief, source run,
  and exact evidence rows that caused it. The route is read-only and has no
  approval, delivery, or deployment side effect.
- Measurement refinement: topic detail now groups real observations by run and
  preserves citation denominators, rates, failures, and run links for future
  control-versus-variant comparison. It does not claim causality or lift.
- Phase 4 first slice: a deterministic evidence-to-finding contract now turns
  stored Firecrawl/Exa observations into review-only technical or citation-gap
  drafts. Drafts retain the exact observation IDs that caused them and cannot
  write to Supabase or trigger Linear, Slack, Zapier, GitHub, or Vercel.
- Phase 4 provenance slice: the Findings surface now shows a stable draft
  analysis ID, agent/rule version, prompt version, model state, zero model cost,
  timestamp, and review-only boundary. This makes the current deterministic
  analyzer inspectable without pretending that a model-backed analysis record
  already exists.
- Phase 4 persistence contract: the `analyses` migration and sanitized payload
  builder define where an analysis snapshot stores its run, version, model,
  prompt, cost, status, source observation IDs, and evidence-linked findings.
  The migration is live as Supabase version `20260829194254` (`analysis_records`)
  and the runtime flag remains disabled.
- Phase 4 experiment slice: a protected manual experiment route now accepts
  only the three approved portfolio topic keys, claims a unique
  `experiment_retest` run, and reuses the bounded Firecrawl/Exa collection
  path. The database claim migration serializes manual runs with the daily
  run so tests cannot overlap or silently target arbitrary URLs.
- Phase 4 guarded persistence slice: the deterministic, evidence-linked
  analysis snapshot can now be persisted behind the disabled-by-default
  `AEO_ANALYSIS_PERSISTENCE_ENABLED` flag. It records provenance and source
  observation IDs but does not call a model, create findings, or trigger
  external actions.
- Phase 4 preview slice: a protected `POST /api/analysis/preview` route can
  read one stored run and return the deterministic, evidence-linked draft
  analysis without writing `analyses`, calling a model, or delivering work.
- Phase 4 dashboard traceability slice: the run-detail page now shows the same
  draft-only analysis directly beneath the provider evidence, including rule
  and prompt provenance, confidence, recommendations, and links back to each
  source observation. Persisted findings remain a separate section so an empty
  findings table cannot be mistaken for a failed collection run.
- Security boundary slice: protected cron, experiment, and analysis-preview
  routes now return stable generic 5xx messages and `no-store` responses while
  server logging records only safe error classification. Detailed provider and
  database errors remain private to the server-side run/error records.
- Provider input boundary slice: Firecrawl and Exa citation links now pass
  through an HTTPS-only sanitizer before they become stored citation URLs or
  rendered links. URLs with unsafe schemes, embedded credentials, malformed
  values, or excessive length are dropped and counted in provider metrics.
- Reporting boundary slice: daily run keys and claim metadata now use an
  explicit, validated reporting timezone. This keeps the calendar date
  reproducible when the Vercel runtime executes in UTC while the operator works
  in Europe/Dublin; the timezone defaults safely to UTC and is not changed in
  production by this local checkpoint.
- Provider reliability slice: Firecrawl and Exa now retry one transient HTTP,
  timeout, or network failure with a bounded backoff. Each provider observation
  records `attempts` and `retryCount`, while permanent HTTP failures are returned
  immediately and remain visible as provider failures.
- Budget guard slice: an optional `AEO_MONTHLY_PROVIDER_BUDGET_USD` hard stop
  now checks completed run spend for the current UTC calendar month before any
  provider call. If the cap is reached, the claimed run is closed as a visible
  failure with zero observations; the control stays disabled when the variable
  is blank and no production variable was changed here.
- Heartbeat slice: running records now carry `heartbeat_at`, refreshed before
  collection and every 15 seconds while providers are executing, then stamped
  again at close. The run-detail surface exposes the last heartbeat, and the
  migration adds an index for stale-run monitoring. Run detail labels a running
  job as live, awaiting, or stale after 45 seconds without a heartbeat; the
  migration has not been applied to production in this local phase.
- Overview monitoring slice: the Observatory overview now queries active runs,
  counts stale heartbeats, and shows a clearly labelled page-load monitoring
  snapshot. This is an operator visibility surface, not a real-time alert
  channel; stale records still require run-detail and provider-log review.
- Phase 5 foundation: GitHub Actions quality gate, dependency review, CodeQL,
  Dependabot configuration, protected-main workflow, Vercel Git deployment,
  and local response-header hardening.

## 2026-08-30 approved-finding follow-up

The approved finding from production run
`d1fdfe48-7e90-4140-bf7f-4ebd78e63778` recommends a separately measurable
answer-page variant. The local branches now register
`seo-vs-aeo-portfolio-variant-b` with the same fixed prompt set as the control,
and the portfolio worktree contains the answer-first, firsthand-proof, and FAQ
refinement at `/insights/seo-vs-aeo-portfolio-variant-b`.

This is a local experiment preparation step only. The control page remains
unchanged, no portfolio push or deployment has been performed, and no fresh
variant observation exists yet. The next gate is review, CI, deployment, then
the same prompt set against control and variant with separate run IDs.

## Current local checkpoint

- The feature branch has been reconciled with the latest `origin/main`.
- Main already contains the production Findings/reporting foundation; this
  checkpoint adds guarded analysis persistence and accurate provenance copy.
- The `analyses` schema is live, but `AEO_ANALYSIS_PERSISTENCE_ENABLED` remains
  false, so no analysis rows have been written and no deployment was performed
  from this branch yet.

## Deferred intentionally

- Public/private Observatory access decision and enforcement.
- Raw-provider/error/citation boundary hardening beyond the derived report.
- Slack and Zapier delivery.
- Search Console and privacy-conscious human analytics adapters.
- Persisted report/outbox/delivery tables and Slack/Zapier activation.
- Model-backed analysis-agent findings, human approval, and experiment
  orchestration remain deferred. The durable analysis persistence path is
  implemented and its service-role-only table is live, but the runtime flag is
  disabled until its review policy is approved. The manual experiment runner
  is collection-only and does not create findings.
- Portfolio redesign and public case-study proof.

The experiment, integration, and architecture pages are explanatory control
plane surfaces only. They do not imply that Search Console, Slack, Zapier, or
model-backed analysis is active.

## Manual gates remaining

1. Review the next fresh daily run in Vercel logs and Supabase. Confirm a new
   run key, Firecrawl target result, Exa result, status, duration, and cost.
2. Confirm the live repository migration history matches the migrations in
   `supabase/migrations/`, including `claim_daily_run` and
   `20260829194254_analysis_records`.
3. Choose the Observatory access model: private operator dashboard or a
   deliberately sanitized public read model.
4. Review and approve the first draft finding in the Observatory before
   enabling analysis persistence or external delivery capability.
   The protected analysis preview route can be used to inspect that draft
   against a specific stored run while the persistence flag remains off.
5. Connect Search Console and analytics only when ready to measure real search
   and human traffic; keep those signals separate from synthetic citations.
6. Approve the first Slack/Zapier test only after a real report is trusted and
   the destination/event idempotency are confirmed.
7. Use the protected GitHub PR path for any push, then verify the Vercel
   preview, production deployment, and follow-up observation before treating a
   site change as an experiment result.

## New manual-run gate

Before using `/api/runs/experiment`, Stephen must apply the additive claim
migration in `supabase/migrations/20260829120000_add_experiment_run_claim.sql`
and deploy the branch through the normal GitHub/Vercel review path. The first
manual run should use `self-improving-website` or
`github-linear-slack-website-loop`; the SEO/AEO topic remains the control.
