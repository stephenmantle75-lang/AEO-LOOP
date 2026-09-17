# Experiment record: SEO vs AEO Variant A

## Status

Drafted locally. Not pushed, deployed, or retested yet.

## Purpose

Test whether a focused clarity and authority improvement makes the existing
SEO-versus-AEO portfolio page easier for an answer engine to retrieve and cite,
while keeping the page useful to a human reader.

This is the first variant against the frozen control. It is not a claim that
the page will earn a citation.

## Experiment identity

| Field | Value |
| --- | --- |
| Experiment key | `seo-vs-aeo-portfolio-clarity-authority-a` |
| Control topic | `seo-vs-aeo-portfolio` |
| Control baseline run | `daily-observation:2026-08-27` |
| Control run ID | `3fa3426a-c038-42cb-9949-20bdf65e8d93` |
| Control target | `https://stephenmantle-portfolio.vercel.app/insights/seo-vs-aeo-portfolio` |
| Portfolio repository | `stephenmantle-portfolio` |
| Change branch | `feature/seo-aeo-variant-a` |
| Current deployment | Local only |
| Retest state | Waiting for approved deployment |

## Baseline evidence

The 27 August production run completed successfully using Firecrawl and Exa.
Firecrawl inspected the target page. Exa returned an answer and external
sources, but did not mention or cite the target page. The recorded result is
therefore `0/1` successful Exa citation checks for this run. This is a small
baseline and must not be treated as a stable long-term rate.

The Exa response returned comparison-oriented sources including Yash Kapure,
HubSpot, and TechRadar. Those sources inform the structure of the variant, but
their copy is not reproduced. The page links to sources as references and does
not imply that any source endorses Stephen Mantle.

## Hypothesis

If the page leads with a tighter direct answer and adds a concise comparison
table, explicit author context, question-led FAQ answers, and source links,
then the page should be easier to extract accurately for portfolio-focused
questions. The expected result is improved mention or citation coverage in
the same provider prompt, but a no-change result remains valid.

## Change set

- Tighten the short answer so the SEO/AEO distinction is explicit in the first
  paragraph.
- Add a semantic SEO-versus-AEO comparison table.
- Add first-person author and experiment context.
- Add two visible question-led FAQ sections.
- Add matching `FAQPage` structured data alongside the existing `Article`
  data.
- Refresh `dateModified` to 27 August 2026.
- Add links to the external sources returned in the observed Exa result,
  alongside official Google references and related work.

## Measurement contract

Do not change the control prompt or target URL. After human review and an
approved portfolio deployment:

1. Confirm the deployed variant returns HTTP 200 and contains the intended
   title, direct answer, canonical, structured data, comparison table, and
   FAQ content.
2. Run the identical Exa prompt against the same target URL.
3. Store the post-change result as a distinct experiment retest linked to this
   experiment key and the deployed commit.
4. Compare `mentioned`, `citation_found`, returned citation URLs, provider,
   freshness, and confidence with the control baseline.
5. Report the denominator and uncertainty. Do not call one positive result a
   durable citation win.

## Guardrails

- The control page remains unchanged in the experiment record.
- No provider payload, credential, or visitor-level data is added to the
  portfolio repository.
- No automated production edit is permitted.
- The portfolio change must pass its repository CI checks before deployment.
- The AEO LOOP dashboard remains the source of truth for provider evidence;
  this document records the experiment intent and linkage.

## Review outcome

Pending human review of the local variant, CI, deployment approval, and a
fresh retest. The current implementation intentionally stops before push and
deployment.
