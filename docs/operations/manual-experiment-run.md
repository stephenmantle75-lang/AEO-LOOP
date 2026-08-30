# Manual experiment run

The protected manual runner lets the operator test one of the approved
portfolio topics without waiting for the daily idempotent cron key.

## What it does

```mermaid
flowchart LR
    H[Authorized POST] --> V[Validate topic key]
    V --> C[Supabase claim]
    C --> F[Firecrawl target page]
    C --> E[Exa bounded prompts]
    F --> D[(runs + observations)]
    E --> D
    D --> R[Optional daily-pulse report]
    R --> O[Review in Observatory]
```

The runner accepts a topic key, not an arbitrary URL or prompt. This keeps
manual tests inside the approved experiment set and prevents an operator or
caller from turning the endpoint into an unrestricted proxy.

The scheduled daily route remains bounded by `AEO_MAX_EXA_PROMPTS` (one prompt
when unset). The paired manual experiment route uses the complete fixed prompt
set by default (ten prompts for the SEO/AEO experiment). Set
`AEO_EXPERIMENT_MAX_EXA_PROMPTS` to a lower value when a cheaper smoke run is
deliberately needed. Both sides of a pair always use the same limit.

For the SEO/AEO experiment, use the paired runner below. It collects the
frozen control and Variant B sequentially, so several comparison batches can
be run in one day without waiting for the daily cron. The original
single-topic endpoint remains available for other approved topics.

## Paired control / Variant B endpoint

```text
POST /api/runs/comparison
Authorization: Bearer $CRON_SECRET
```

The endpoint accepts no body. It always runs the approved pair:

- Control: `seo-vs-aeo-portfolio`
- Variant: `seo-vs-aeo-portfolio-variant-b`

Each pair uses two `experiment_retest` runs with separate IDs and a unique
`comparisonKey`. The control and variant are executed sequentially because
the database overlap guard allows only one active observation run at a time.

## Endpoint contract

```text
POST /api/runs/experiment
Authorization: Bearer $CRON_SECRET
Content-Type: application/json
```

Body:

```json
{ "topicKey": "self-improving-website" }
```

Approved topic keys:

- `seo-vs-aeo-portfolio`
- `seo-vs-aeo-portfolio-variant-b`
- `self-improving-website`
- `github-linear-slack-website-loop`

The response includes the `runId`, `runType`, `topicKey`, run status,
observation count, and report persistence status. A successful run is stored
as `run_type = experiment_retest` with a unique key in the form:

```text
experiment:<topic-key>:<started-at>:<random-id>
```

## Status codes

| Status | Meaning |
|---|---|
| `200` | Collection completed; inspect the returned run in the Observatory |
| `202` | The claim was refused because the key already exists or another observation run is active |
| `401` | Missing or invalid `CRON_SECRET` authorization |
| `422` | Invalid JSON or an unapproved topic key |
| `500` | Collection or report persistence failed; inspect the run and Vercel logs |

## Safe execution sequence

1. Apply `supabase/migrations/20260829120000_add_experiment_run_claim.sql`
   to the approved AEO LOOP Supabase project.
2. Confirm the branch containing this endpoint is deployed to a Vercel
   preview or production environment.
3. Run one topic at a time with the same `CRON_SECRET` already used by the
   protected daily route. Do not paste the secret into shell history or chat.
4. Open `/runs` and the returned `/runs/<runId>` route in the Observatory.
5. Compare Firecrawl inspectability, each Exa query, result count, target result
   position, citation status, duration, cost, and report persistence with the
   daily control run.
6. Keep the current SEO/AEO topic as the control when testing a different
   topic. Do not interpret a different topic as a content-lift experiment.

Example using a shell variable already loaded in the operator environment:

```bash
curl -X POST "$AEO_LOOP_URL/api/runs/experiment" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  --data '{"topicKey":"self-improving-website"}'
```

Run a paired comparison batch:

```bash
curl -X POST "$AEO_LOOP_URL/api/runs/comparison" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Repeat only after the previous response completes. Use the returned control
and variant run IDs, plus the shared comparison key, when reviewing the
results in the Observatory.

On each run detail page, an Exa observation now reports whether the target was
returned in the result set and its result position when matched. This is still
a synthetic search-presence measurement, not proof that a generated answer
would cite the page.

The endpoint does not create Linear issues, send Slack/Zapier messages, edit
portfolio files, or deploy code. Those remain separate human-approved phases.

## Read-only analysis preview

After a run is stored, the operator can inspect the deterministic analysis
without enabling cron persistence:

```text
POST /api/analysis/preview
Authorization: Bearer $CRON_SECRET
Content-Type: application/json
```

Body:

```json
{ "runId": "<stored-run-uuid>" }
```

The response is explicitly `mode = draft_only`. It loads the selected run and
its observations, returns evidence-linked draft findings, and performs no
database write, model call, Linear/Slack/Zapier delivery, portfolio edit, or
deployment. It rejects non-UUID run IDs and does not accept a topic or URL,
which keeps the preview tied to an existing stored run.

```mermaid
flowchart LR
    O[Authorized operator] --> P[POST /api/analysis/preview]
    P --> V[Validate stored run UUID]
    V --> S[(Supabase read: run + observations)]
    S --> D[Deterministic draft rules]
    D --> R[JSON review response]
    R -. no write .-> A[(analyses table)]
    R -. no delivery .-> L[Linear / Slack / portfolio]
```

This is the next ANT-36 testable slice: it proves the evidence-to-finding
boundary on demand while the durable persistence flag remains disabled.
