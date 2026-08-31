# SEO vs AEO answer-page Variant B

## Purpose

Convert the approved citation-gap finding into a controlled, reviewable page
experiment without changing the existing control page or publishing private
observability results.

## Contract

| Field | Value |
|---|---|
| Experiment key | `seo-vs-aeo-portfolio-answer-clarity-b` |
| Control topic | `seo-vs-aeo-portfolio` |
| Variant topic | `seo-vs-aeo-portfolio-variant-b` |
| Control target | `https://stephenmantle-portfolio.vercel.app/insights/seo-vs-aeo-portfolio` |
| Variant target | `https://stephenmantle-portfolio.vercel.app/insights/seo-vs-aeo-portfolio-variant-b` |
| Same prompt set | Yes |
| Current state | Initial paired baseline complete; ANT-59 content iteration prepared locally |

## Hypothesis

A concise, standalone answer followed by an explicit SEO/AEO comparison,
truthful firsthand proof, and a complete FAQ will make the page easier to
understand and extract without reducing human usefulness.

## Variant changes

- Stronger answer-first wording in the short-answer block.
- A public, firsthand explanation of the AEO Growth Loop work.
- Clear separation between public method and private operational evidence.
- An explicit responsible-proof row in the comparison table.
- A control/variant explanation for readers and operators.
- A fourth FAQ question with matching FAQPage structured data.

No provider results, citation rates, costs, run IDs, database rows, or
unpublished performance claims are rendered on the public page.

## Next iteration — ANT-59

The first paired full-prompt comparison did not establish Variant B as the
winner. The control therefore remains frozen. The next isolated content change
adds one visible section titled “What this page has actually tested” to the
Variant B page. It states what was built, how the ten-prompt comparison ran,
what was observed, and what the result does not prove.

The change is prepared in the separate `stephenmantle-portfolio` repository as
local commit `8fc8fd7` on branch `feature/ant-57-vercel-canonical-variant-b`.
It is not yet a Preview deployment. The canonical host, metadata, sitemap,
robots file, links, layout, control page, and prompt set remain unchanged.

## Test sequence

- [x] Preserve the current control page.
- [x] Add the local Variant B route and portfolio metadata.
- [x] Register the variant as an approved AEO LOOP topic.
- [x] Review the local page and source links.
- [x] Run portfolio CI and create a human-reviewed PR.
- [x] Deploy the variant to its intended production URL.
- [x] Confirm the deployed URL and commit before collection.
- [x] Run the same fixed prompt set against control and variant through the paired route.
- [x] Keep the scheduled daily route bounded while allowing full-prompt manual batches.
- [x] Store Exa target result position and result-count diagnostics per query.
- [x] Record the initial paired result as no established Variant B win.
- [ ] Push the ANT-59 content commit and review the Vercel Preview.
- [ ] Run the same ten-prompt paired comparison after Preview review.
- [ ] Compare citation outcome, inspectability, evidence quality, and human usefulness.
- [ ] Record the result and decision in Linear and Notion.

## Guardrails

- A single citation result does not prove durable lift.
- The variant must not replace or mutate the control during the comparison.
- The observatory remains the source of truth for measurements.
- Push, merge, deployment, and production collection remain human-approved
  release gates.
