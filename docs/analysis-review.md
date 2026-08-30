# Authenticated analysis review

## What this adds

The Observatory now has a local-first, opt-in human review boundary for the durable analysis snapshots created by ANT-36.

```text
providers → observations → draft analysis → authenticated review → finding
                                                  ↓
                                      later delivery adapters
```

The review action is deliberately separate from the cron credential. `CRON_SECRET` remains a machine-to-machine credential for scheduled routes; a human reviewer signs in through Supabase Auth and is authorized by an explicit server-side user UUID allowlist.

## Local configuration

The feature is disabled until all of these values are configured in the local `.env.local` file:

```text
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>
AEO_REVIEW_AUTH_ENABLED=true
AEO_REVIEWER_USER_ID=<UUID of the approved Supabase Auth user>
```

The publishable key is safe for the browser only when the database's RLS and grants remain correct. Never use `SUPABASE_SERVICE_ROLE_KEY` in browser code. The reviewer UUID is server-only and should be the UUID from Supabase Dashboard → Authentication → Users.

The login screen uses a magic link with `shouldCreateUser: false`, so an unknown address cannot self-register through this surface. The Supabase Auth email provider and redirect URL still need to be configured manually in the Supabase Dashboard before local sign-in can work.

## Review behavior

- `/review/[runId]` requires an authenticated, allowlisted reviewer.
- `POST /api/analysis/review` requires the same authenticated reviewer and a same-origin request.
- A non-empty review note is required for both approval and rejection.
- The database RPC accepts only `draft → approved` or `draft → rejected` once.
- Approval creates `findings` rows linked to the analysis and source evidence IDs.
- Approval also queues one idempotent delivery intent per finding and channel in
  `finding_delivery_events`; the intent contains a relative dashboard path and
  sanitized finding context for downstream adapters.
- Every decision creates one append-only `analysis_review_events` row.
- Rejection creates no finding.
- The migration does not send Linear, Slack, or Zapier messages. External
  adapters remain disabled until their credentials, retry policy, and callback
  contract are reviewed.

## Migration and production gate

`supabase/migrations/20260829224252_secure_analysis_review.sql` establishes the
review boundary. The follow-on
`supabase/migrations/20260830170000_finding_delivery_intents.sql` adds the
atomic intent queue. Applying either migration and enabling
`AEO_REVIEW_AUTH_ENABLED=true` are separate release steps; external delivery
adapters still require their own credential and retry-policy review.

## Test cases

The implementation must be checked with:

1. Auth disabled: review route does not expose analysis data and review API returns a configuration response.
2. Unauthenticated: review page redirects to login and review API returns 401.
3. Authenticated but wrong user: review page/API return 403.
4. Missing, malformed, cross-origin, or oversized input: request is rejected.
5. Valid approval: one finding per draft candidate and one audit event are created.
6. Valid rejection: the analysis is rejected and no finding is created.
7. Repeated decision: the database refuses a second decision.
8. Invalid or cross-run evidence: the database refuses the transition.
