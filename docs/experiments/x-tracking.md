# X campaign tracking extension

Status: design ready; no X credentials or live collection connected.

## Decision

Add an **X tracking** tab to the existing AEO Loop Observatory. Do not create a separate dashboard. The campaign already belongs to the same loop: source → decision → publish → evidence → learning.

## What the research supports

The X API v2 documentation describes access to public engagement metrics and private metrics for the authenticated user's own posts. `conversation_id` allows thread-level grouping. X uses pay-per-usage pricing and endpoint rate limits, so collection should be batched, cached, and explicit about freshness. The metrics documentation also describes a limited window for non-public organic and promoted metrics, so historical snapshots must be stored rather than reconstructed later.

Sources:

- [About the X API](https://docs.x.com/x-api/getting-started/about-x-api)
- [Metrics](https://docs.x.com/x-api/fundamentals/metrics)
- [Rate limits](https://docs.x.com/x-api/fundamentals/rate-limits)

## Recommended first vertical slice

1. Register each published post with `post_id`, `conversation_id`, URL, campaign key, published timestamp, hook, format, linked public asset, and approval state.
2. Authenticate with X OAuth user context for Stephen's own posts.
3. Collect public metrics and private metrics on a schedule, storing immutable snapshots with `observed_at` and provider response metadata.
4. Record first-party Notes page visits and outbound clicks with a campaign/post key. Do not use X reach as a proxy for customers.
5. Show attention, response, durable visits, and learning separately in the dashboard.
6. Write the conclusion back to the campaign record in Notion and the measurement issue in Linear.

## Boundaries

- X API is the source for X post identity and X metrics.
- Supabase remains the private source of truth for measurements.
- Firecrawl validates the linked public Notes page; it does not replace X analytics.
- Notion stores the campaign narrative and retrospective.
- Linear stores the decision, next action, and work required to change the next batch.
- No live numbers are shown until a real authenticated collection run succeeds.

## Initial hypothesis

For this account, consistent posting and genuine connection will produce more useful response than occasional high-effort or viral posts. Reach may rise without producing durable value. The experiment should test that claim against the account's own data, with the restriction/recovery period recorded as a limitation and context rather than presented as a universal platform rule.
