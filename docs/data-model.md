# AEO LOOP data model

## Purpose

Supabase is the private system of record for the AEO growth loop. It stores what the collectors actually observed, what the analysis agent inferred, and which recommendation was approved for action. The public portfolio site does not expose this evidence directly.

This is the v1 foundation, not the complete final schema. The reporting slice
now adds `reports`, `report_outbox`, and `delivery_events` because delivery
needs a durable, idempotent contract. The analysis slice adds durable draft
snapshots plus an explicit human-review event. Other domain tables for
research batches, metrics, experiments, and deployments should still be
introduced only as working vertical slices need them.

Project: `AEO LOOP` in `mants org`
Region: `eu-west-1`
Supabase project ref: `kufgerwuvilhtxhjrsbl`

## Flow

```text
Vercel Cron
  -> provider adapters (Exa, Firecrawl, Search Console)
  -> runs (one durable execution record)
  -> observations (normalized evidence and citations)
  -> findings (evidence-backed recommendations)
  -> human review in Observatory
  -> finding delivery intents
  -> Linear / Zapier / Slack delivery
  -> approved GitHub change and site retest
```

## V1 tables

### `runs`

One row per collection, analysis, manual, or experiment-retest execution.

Important fields:

- `run_key`: idempotency key. A retry must reuse the same key rather than create an ambiguous duplicate.
- `status`: lifecycle state from `queued` through `succeeded`, `partial`, or `failed`.
- `sources`: providers attempted during the run.
- `duration_ms` and `cost_usd`: operational evidence for the dashboard.
- `metadata`: non-secret run configuration and provider versions.

### `observations`

The normalized evidence layer. Every observation points to a `run_id` and has a provider, topic, question, observation type, and timestamp.

Citation checks use:

- `mentioned`: whether the target was mentioned in the returned answer or result.
- `citation_found`: whether a citation was present.
- `citation_urls`: compact URL list for dashboard tables and filters.
- `citations`: structured citation records, such as title, URL, position, and snippet.
- `source_url`: the provider result or page used to substantiate the observation.
- `metrics`: normalized provider metrics without storing provider secrets.

Raw provider responses must not be copied into public DTOs. If raw payload retention becomes necessary, it should be added to a private schema or encrypted storage with an explicit retention policy.

### `findings`

The recommendation layer. Each finding points to the run that produced it and records the reasoning needed for human review.

- `evidence_ids`: observation IDs supporting the recommendation.
- `evidence`: public-safe summary of the supporting evidence.
- `suggested_patch`: structured change proposal; never an automatically deployed patch.
- `status`: review and delivery lifecycle.
- `linear_issue_*`: external work tracking references.
- `slack_delivery_status`: notification delivery state.

Approved analysis candidates are copied into `findings` with `analysis_id` and
`source_key`, preserving the exact draft candidate that became actionable.

### `finding_delivery_events`

An atomic handoff record created when an approved analysis inserts a new
finding. It creates one queued event for each downstream channel (`linear`,
`slack`, and `zapier`) with the stable event ID
`finding.created:<finding-id>`. The `(finding_id, channel)` and
`(event_id, channel)` constraints make approval retries safe. This table is an
intent queue, not an external sender; adapter workers and callback handling are
the remaining ANT-39 work.

### `analyses`

One deterministic, evidence-linked analysis snapshot for a stored run.

- `status`: `draft`, `approved`, or `rejected`.
- `observation_ids`: source evidence IDs that the snapshot is allowed to use.
- `findings`: draft candidates, each retaining its evidence IDs.
- `reviewed_by`, `reviewed_at`, and `review_note`: human decision metadata.

### `analysis_review_events`

An append-only record of the single review decision for an analysis. It stores
the reviewer UUID, decision, note, run, and evidence IDs. It is service-role
only and is written in the same database transition that changes an analysis
status and, for approval, creates findings.

### `reports`

One sanitized, versioned report contract derived from a stored run. A report is
reproducible from its `run_id` and has a unique `event_id` so retries do not
create a second logical report. The JSON payload is the `daily-pulse.v2`
contract; raw provider payloads and visitor-level analytics are excluded.

### `report_outbox`

The durable handoff between report creation and external delivery. It records
the queued payload, status, attempt count, lock time, and last error. It is not a
cron scheduler and does not decide what the report means.

### `delivery_events`

One idempotent delivery record per report/channel pair (`slack`, `linear`, or
`zapier`). It stores external IDs and response metadata so a retry can be
audited without duplicating a message or issue.

## Access boundary

All tables have Row Level Security enabled. Anonymous and authenticated table
access is revoked. The Observatory server uses the Supabase service role in a
server-only environment; that key must never be placed in `NEXT_PUBLIC_*`
variables or browser code. The reporting and analysis tables remain
service-role only. Human review is separately gated by Supabase Auth and a
server-side owner UUID allowlist; the review flag is disabled until that
manual configuration is complete.

## Provenance rules

1. No observation without a parent run.
2. No finding without a parent run and evidence reference.
3. Store provider, topic, timestamp, and source URL for every observation.
4. Preserve the original question/prompt used for an answer check.
5. Keep raw/private payloads separate from public-safe dashboard responses.
6. Never treat an AI-generated recommendation as a shipped change until a human approves the corresponding GitHub PR.

## Run-claim safety

`claim_daily_run()` serializes daily claims with a Postgres advisory lock. It
returns `claimed=true` only when the idempotency key is new and no other daily
run is currently `running`. Replaying the same key returns `reason=duplicate`;
an overlapping daily job returns `reason=overlap`.
