# AEO LOOP reporting contract

This document defines how a real observation becomes a useful dashboard view
and a Slack update. It is the contract for Mode B: an ongoing measurement loop.

The screenshots used during planning are visual references for information
density and hierarchy. They are not evidence and must not be copied into the
database as real results.

## Current implementation slice

`src/lib/reporting.ts` now derives the `daily-pulse.v1` shape from stored
`runs`, `observations`, and `findings` records. The overview previews the
derived KPI and funnel, `/reports/[id]` provides a reproducible report review
surface, and `/findings` provides a database-backed persisted-finding list plus
draft-only recommendations from the latest run. The reporting migration is now
applied to production, and typed helpers define
`reports → report_outbox → delivery_events`.

The cron close path has a disabled-by-default switch,
`AEO_REPORT_PERSISTENCE_ENABLED=true`. When enabled, a completed observation
run is reloaded from Supabase, converted into the sanitized `daily-pulse.v1`
contract, and written to `reports` with a matching queued row in
`report_outbox`. A report persistence error does not rewrite a successfully
completed observation run as failed; the cron response returns
`reportStatus: "failed"` so the operational distinction remains visible.
Missing comparison history, Search Console data, human analytics, clicks, and
engagement remain explicitly unavailable.

## Current delivery gate — 27 August 2026

The first production-shaped run is stored as `partial`: Firecrawl was aimed at
the Observatory route and returned HTTP 404, while Exa completed with no target
citation. The corrected public portfolio target has since produced a successful
27 August run: Firecrawl returned an inspectable HTTP 200 page and Exa returned
ten external results without citing the target. This confirms the collection
path and establishes a content baseline; it is not a citation win. Hold Slack
delivery and portfolio changes until the draft finding is reviewed and the
control/variant experiment is defined. The earlier checkpoint is recorded in
[docs/operations/2026-08-26-verification-checkpoint.md](operations/2026-08-26-verification-checkpoint.md).

## What Slack is for

Slack is the operator surface, not the source of truth. Supabase remains the
authoritative record; the Observatory is the investigation surface; Slack is
the place Stephen receives a concise pulse and links into the evidence.

Slack begins in **Phase 4 — Findings & Delivery**, after the collection and
analysis contracts are stable. The first useful sequence is:

```text
daily run closes
  → evidence is stored
  → analysis creates a finding or confirms no change
  → report contract is rendered
  → one AEO Loop Pulse is posted to #aeo-growth-loop
  → actionable findings are linked to Linear
  → delivery IDs and status return to Supabase
```

There are three reporting cadences:

| Cadence | Trigger | Purpose | Slack behaviour |
|---|---|---|---|
| Daily pulse | Each successful or partial run | Show what changed and what needs attention | One parent message with links and optional visual card |
| Immediate alert | Critical technical failure, budget breach, or data-integrity problem | Prevent silent failure | Short alert; no full digest duplication |
| Weekly review | Seven-day aggregation | Review trends, experiments, and unresolved findings | One summary with the next decisions |

The daily pulse must still be emitted for a partial run, but it must clearly
label missing providers and stale metrics. A provider failure must never be
silently represented as a zero.

## Daily pulse layout

The first version should follow the hierarchy shown in the supplied Slack
example:

```text
🟢 AEO LOOP PULSE · 26 Aug · partial / healthy / attention
Run: completed at 08:07 · 3 topics · 1 page · freshness: today

CORE SIGNALS
Citation rate        2/10 prompts   ↑ +10 pp vs 7-day baseline
Target page found    1/3 topics     — no comparable change
Search clicks        unavailable    Search Console not connected
Human referrals      0 recorded     analytics adapter not connected

FUNNEL
Discovered → cited → clicked → engaged
     10            2        —          —

BIGGEST LEAK
Citation → click is not measurable yet.
Next action: connect Search Console and analytics before claiming traffic lift.

NEXT DECISIONS
1. Review finding F-0007 in Observatory
2. Approve or reject the proposed answer-page change

[Open Observatory] [Open run] [Open Linear issue]
```

Values must be real or explicitly marked unavailable. Every delta needs a
comparison window and denominator. “Citation rate” is a repeated observation
rate, not a single pass/fail result from one prompt.

## Report payload

The application should create a versioned, sanitized report object before
delivery. It is stored or referenced by `run_id`; it is not a replacement for
the raw observations.

```json
{
  "schemaVersion": "daily-pulse.v1",
  "eventId": "daily-pulse:2026-08-26:run-123",
  "reportType": "daily_pulse",
  "runId": "run-123",
  "window": {
    "start": "2026-08-25T08:00:00Z",
    "end": "2026-08-26T08:00:00Z",
    "timezone": "Europe/Dublin",
    "comparison": "previous_7_complete_days"
  },
  "health": "partial",
  "kpis": [
    {
      "key": "synthetic_citation_rate",
      "label": "Citation rate",
      "value": 0.2,
      "displayValue": "2/10",
      "delta": 0.1,
      "unit": "rate",
      "denominator": 10,
      "source": "citation_checks",
      "freshness": "2026-08-26T08:07:00Z",
      "confidence": "observed"
    }
  ],
  "funnel": {
    "stages": [
      { "key": "discovered", "value": 10 },
      { "key": "cited", "value": 2 },
      { "key": "clicked", "value": null, "status": "not_connected" },
      { "key": "engaged", "value": null, "status": "not_connected" }
    ],
    "biggestLeak": {
      "from": "cited",
      "to": "clicked",
      "status": "not_measurable"
    }
  },
  "insights": [],
  "actions": [],
  "artifacts": [],
  "links": {
    "dashboard": "https://aeo-loop.vercel.app/",
    "run": "https://aeo-loop.vercel.app/runs/run-123"
  }
}
```

The example values are illustrative only. Tests and seed data must not use
them as live evidence.

## Visual report artifacts

The screenshots reveal two useful visual artifacts to build:

1. **Funnel card** — a compact image showing stages, counts, conversion rates,
   and the largest measured leak.
2. **System map** — a dashboard/report view showing named jobs grouped under
   Sync, Sense, Decide, Act, and Report, all converging on the reporting hub.

The Observatory should render these as accessible HTML first. It may later
generate a sanitized PNG or OG image for Slack and case-study sharing. The
artifact record must include `run_id`, `kind`, `schema_version`, generated
timestamp, and a content hash. Never place raw provider payloads, visitor-level
analytics, prompts marked private, or credentials in an image.

Slack supports structured Block Kit messages and image blocks. For an image,
the implementation must provide alt text and either a Slack-hosted file or a
safe hosted image URL. See [Slack Block Kit image blocks](https://api.slack.com/reference/block-kit/blocks)
and [Slack incoming webhooks](https://api.slack.com/messaging/webhooks).

## KPI dictionary for v1

The dashboard and Slack must use the same definitions. Keep synthetic evidence
separate from actual search and human traffic.

| Family | v1 metric | Source | Decision it supports |
|---|---|---|---|
| Synthetic discovery | Target page found rate | `citation_checks` / Exa observations | Is the page discoverable for the controlled prompt set? |
| Synthetic citation | Citation rate and cited-page rate | `citation_checks` | Is the target page selected and linked as evidence? |
| Search visibility | Impressions, clicks, CTR, position | Search Console | Is real search demand moving? |
| Human traffic | Sessions/referrals and key clicks | Analytics | Are people reaching and using the page? |
| Funnel | Stage-to-stage conversion | Derived event metrics | Where is the largest measurable loss? |
| Reliability | Run status, freshness, failed adapters | `runs`, `job_runs` | Can the evidence be trusted today? |
| Cost | Provider cost by run and month | provider metadata / `job_runs` | Is the loop within its budget? |
| Work | New, approved, shipped, and retested findings | `findings`, work records | Is evidence becoming controlled improvement? |

Every displayed metric needs: value, unit, denominator, date window, comparison
basis, source, freshness, and status. No aggregate “AEO score” is required.

## Delivery and idempotency

`eventId` is the stable idempotency key. The database must record delivery
attempts and external IDs so retries are safe:

```text
report_outbox
  → delivery_events
  → Zapier webhook (optional bridge)
  → Slack parent message / thread reply
  → Linear issue or update for actionable finding
  → delivery callback and external IDs
```

Zapier should remain an external bridge for approved Linear/Slack actions. It
must not calculate KPIs, own the schedule, or become the evidence database.
The direct Slack destination is the existing `#aeo-growth-loop` channel once
the connection and destination are confirmed. Do not send mass mentions by
default.

The staged migration is
`supabase/migrations/20260827103000_reporting_delivery_contract.sql`. Before
it is applied, the operator must review retention, channel approval, and retry
behaviour. The application must then persist the sanitized report only after a
run closes, enqueue one outbox event by `event_id`, and use
`(event_id, channel)` as the delivery idempotency key.

## Slack delivery adapter (ANT-58)

`src/lib/slack.ts` sends via a plain `fetch` to `chat.postMessage` — no new
dependency. `src/lib/slack-delivery.ts` drains `report_outbox` (one rich
pulse per report, Block Kit, formatted per the layout above) and the
`channel = 'slack'` rows of `finding_delivery_events` (one short
alert-with-link per approved finding, `🔍 finding [priority] — title. <link>`)
into `#aeo-growth-loop`. Both queries claim a row (`status: queued →
processing`) before sending so two overlapping cron runs cannot double-post,
and every attempt is written back to Supabase — `delivery_events` for
reports, the same `finding_delivery_events` row for alerts — with status,
`external_id` (the Slack message ts), and `delivered_at`.

`src/app/api/cron/deliver-slack/route.ts` runs both drains on the same
`CRON_SECRET` bearer auth as the daily-observation cron. It is a no-op
(`202 slack_delivery_disabled`) until two things are set, matching the
existing `AEO_REPORT_PERSISTENCE_ENABLED` gate pattern:

- `AEO_SLACK_DELIVERY_ENABLED=true`
- `SLACK_REPORT_BOT_TOKEN` — Pulse's bot token, posts the daily pulse
- `SLACK_ALERT_BOT_TOKEN` — Hermes's bot token, posts the short finding alerts
- (`SLACK_AEO_CHANNEL` overrides the channel; defaults to `#aeo-growth-loop`)

Both bots are already invited into `#aeo-growth-loop`. Each drain checks its
own token independently, so setting only one goes half-live rather than
waiting on both. Tests: `tests/slack.test.ts` (message
formatting, Slack success/error/network-failure), `tests/slack-delivery.test.ts`
(sent, a failed run still ships its pulse, a Slack-side send error, the
claim race that prevents a duplicate send, and a Supabase read failure
surfacing as `readError: true` instead of a silent zero summary).

**Live status — 30 August 2026.** `AEO_SLACK_DELIVERY_ENABLED=true` and both
bot tokens are set on Vercel. A production test run returned `reports:
{sent:0, failed:0, skipped:0}` against 15 genuinely queued `report_outbox`
rows — before this fix that looked like an empty queue; it was actually the
Supabase read failing silently, cause not yet identified (same service-role
key reads `finding_delivery_events` successfully in the same request, so
it's not a blanket credential problem). `findingAlerts` reached Slack and
got `invalid_auth` back from `chat.postMessage` for both queued alerts —
`SLACK_ALERT_BOT_TOKEN` (Hermes) needs a fresh Bot User OAuth Token from
api.slack.com/apps. `SLACK_REPORT_BOT_TOKEN` (Pulse) validity is still
unconfirmed — the report drain never got far enough to call Slack. Re-run
the cron once the alert token is fixed; the response's `reports.readError`
field will show whether the report-side read is now fixed too or needs
separate investigation.

Not built here: Supabase platform-health metrics (slow queries, connections,
disk/CPU) — that needs a Supabase Management API token, which is a separate,
currently-dead credential (see the MCP connection audit). This adapter only
covers the application-data half of ANT-58 (daily pulse + finding alerts).

## Acceptance checklist

- [ ] A daily pulse can be reproduced from a stored run without re-calling a provider.
- [ ] A partial run produces an honest partial report.
- [ ] Deltas show their comparison window and denominator.
- [ ] Biggest-leak logic returns “not measurable” when a later stage is unavailable.
- [ ] One event ID cannot create duplicate Slack messages or Linear issues.
- [ ] Slack contains links back to the run, finding, and relevant dashboard view.
- [ ] The dashboard, Slack message, and public case study use the same sanitized report vocabulary.
- [ ] Images have alt text and do not expose private evidence.
