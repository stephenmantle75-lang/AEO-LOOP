# AEO measurement repair — 2026-09-04

## Decision

The current citation result is a failed experiment signal, but the stored
window was not a valid live-domain comparison. Start a new measurement window
after deploying the repair. Keep the previous rows as historical evidence; do
not mix them into the new baseline.

## Evidence

The Supabase observations showed:

- Control and Variant B both had zero Exa citations.
- 59 of 61 Exa checks used the retired
  `stephenmantle-portfolio.vercel.app` host.
- Only one live-domain Exa check was recorded for each side.
- The scheduled paired check ran one prompt per side, so Slack reported `0/1`.
- Firecrawl reaching a page proves page inspectability, not citation.

## Code changes

- Known retired and apex portfolio hosts are normalized to
  `https://www.stephenmantle.com`.
- Unknown target hosts fall back to the canonical live target instead of being
  accepted from a stale environment value.
- Scheduled paired checks use `AEO_DAILY_EXA_PROMPTS`, defaulting to three
  prompts and bounded to the fixed ten-prompt set.
- Persisted reports and Slack messages now show target host, canonical-target
  validity, and observed/expected prompt coverage.

## New test sequence

1. Deploy the measurement repair and verify the deployed commit.
2. Confirm the next control and Variant B observations both record the live
   `www.stephenmantle.com` host.
3. Run one manual ten-prompt paired baseline.
4. Let the daily route collect three prompts per side for three to seven days.
5. Compare citation rate by prompt shape, target result position, result count,
   provider, and cost.
6. Only after that baseline is valid, change one content variable on Variant B.

No citation outcome is guaranteed. The repair makes the experiment measurable
and prevents a stale target or a one-prompt denominator from producing a
misleading conclusion.
