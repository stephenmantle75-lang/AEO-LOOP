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
| Current state | Local preparation only |

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

## Test sequence

- [x] Preserve the current control page.
- [x] Add the local Variant B route and portfolio metadata.
- [x] Register the variant as an approved AEO LOOP topic.
- [ ] Review the local page and source links.
- [ ] Run portfolio CI and create a human-reviewed PR.
- [ ] Deploy the variant to its intended production URL.
- [ ] Confirm the deployed URL and commit before collection.
- [ ] Run the same fixed prompt set against control and variant.
- [ ] Compare citation outcome, inspectability, evidence quality, and human usefulness.
- [ ] Record the result and decision in Linear and Notion.

## Guardrails

- A single citation result does not prove durable lift.
- The variant must not replace or mutate the control during the comparison.
- The observatory remains the source of truth for measurements.
- Push, merge, deployment, and production collection remain human-approved
  release gates.
