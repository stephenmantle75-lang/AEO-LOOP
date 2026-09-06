# AEO measurement repair — 2026-09-04

## Decision

The current citation result is a failed experiment signal, but the stored
window was not a valid isolated-app comparison. Start a new measurement window
after deploying the repair. Keep the previous rows as historical evidence; do
not mix them into the new baseline.

## Evidence

The Supabase observations showed:

- Control and Variant B both had zero Exa citations.
- Most Exa checks used a retired or unintended target configuration.
- The current report showed the live custom domain, which is outside the
  experiment contract.
- The scheduled paired check ran one prompt per side, so Slack reported `0/1`.
- Firecrawl reaching a page proves page inspectability, not citation.

## Code changes

- Experiment targets are pinned to
  `https://stephenmantle-portfolio.vercel.app`.
- The live custom domain and unknown hosts are rejected and fall back to the
  isolated Vercel target instead of being accepted from a stale environment
  value.
- Scheduled paired checks use `AEO_DAILY_EXA_PROMPTS`, defaulting to three
  prompts and bounded to the fixed ten-prompt set.
- Persisted reports and Slack messages now show target host, canonical-target
  validity, and observed/expected prompt coverage.

## New test sequence

1. Deploy the measurement repair and verify the deployed commit.
2. Confirm the next control and Variant B observations both record the
   `stephenmantle-portfolio.vercel.app` host.
3. Run one manual ten-prompt paired baseline.
4. Let the daily route collect three prompts per side for three to seven days.
5. Compare citation rate by prompt shape, target result position, result count,
   provider, and cost.
6. Only after that baseline is valid, change one content variable on Variant B.

No citation outcome is guaranteed. The repair makes the experiment measurable
and prevents a stale target or a one-prompt denominator from producing a
misleading conclusion.
