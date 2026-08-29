# Experiment: SEO vs AEO for a personal portfolio

## Purpose

Establish a repeatable baseline for whether the public portfolio explains the
difference between SEO and AEO clearly enough for answer engines to retrieve,
attribute, and describe the page accurately.

This is an evidence experiment, not a claim that the page is already winning
citations. A provider result is recorded as evidence only when the provider was
actually queried and the returned source or answer can be inspected.

The first proposed content variant is recorded in
[2026-08-27-seo-vs-aeo-variant-a.md](2026-08-27-seo-vs-aeo-variant-a.md). The
current page remains the control until that variant is approved and deployed.

## Topic contract

| Field | Value |
| --- | --- |
| `topic_key` | `seo-vs-aeo-portfolio` |
| Question | What is the difference between SEO and AEO for a personal portfolio? |
| Target URL | `https://stephenmantle-portfolio.vercel.app/insights/seo-vs-aeo-portfolio` |
| Canonical URL | `https://stephenmantle-portfolio.vercel.app/insights/seo-vs-aeo-portfolio` |
| Owner | Stephen Mantle |
| Measurement status | Baseline blocked until the production page is verified as the intended answer page |

The public portfolio Vercel app is the measurement target for this first slice.
The AEO Loop Observatory remains the dashboard and collection runtime; the
portfolio app and real domain are separate concerns.

## Fixed prompt set

Run these prompts unchanged for each provider and retest. Store the exact
prompt in `observations.question`.

1. What is the difference between SEO and AEO for a personal portfolio?
2. How should a personal portfolio use SEO and AEO together?
3. What does AEO mean for a designer or developer portfolio?
4. How can a portfolio become more likely to be cited by AI answer engines?
5. What should a portfolio page include to answer an employer's question clearly?
6. SEO versus AEO: which matters more for a personal portfolio?
7. Give an example of an AEO improvement for a personal portfolio.
8. How do you measure whether AEO is improving a portfolio?
9. What is the difference between being found in search and being cited in an answer?
10. Which page on Stephen Mantle's website explains SEO versus AEO for portfolios?

## Provider roles

- **Firecrawl page fetch:** confirm the target URL returns the intended answer
  page, extract its visible answer blocks, headings, metadata, and links.
- **Exa answer/search check:** run the fixed prompt set and inspect whether the
  target URL is returned, mentioned, or used as a citation. Exa results are
  synthetic visibility evidence, not human traffic.
- **Google Search Console:** later, measure real Google impressions, clicks,
  queries, and average position after the page has accumulated data.
- **Manual review:** a human checks factual accuracy, usefulness, source
  quality, and whether an employer can understand the answer quickly.

## Baseline acceptance criteria

The page is ready for a baseline when all of the following are true:

- the target URL returns HTTP 200 after redirects;
- the returned document contains the intended title and direct answer;
- the canonical URL, metadata, and structured data identify the same page;
- at least one answer-engine provider can be queried successfully;
- each provider result has a durable run record and a normalized observation;
- no citation win is claimed from a failed, stale, or unauditable response.

The 26 August run remains a blocked baseline because the production
configuration still sent Firecrawl to the old Observatory URL and Firecrawl
returned HTTP 404. The same-day retry returned `202` as a duplicate by design.
Re-evaluate these criteria with the next fresh daily run after the production
`AEO_TARGET_URL` variable is corrected.

## Metrics

For each prompt/provider pair, record:

- `mentioned`: the portfolio or target page appears in the returned answer;
- `citation_found`: a clickable target citation appears in the response;
- `citation_urls`: URLs returned with the answer;
- `metrics`: provider response metadata, result position, and extraction checks;
- `status`: `observed`, `failed`, or `skipped`.

The first useful comparison is prompt coverage and citation rate, not a vanity
single score:

```text
citation rate = prompts with target citation / successful prompts
mention rate  = prompts mentioning target / successful prompts
page integrity = required page checks passed / required page checks
```

Do not combine provider visibility with Search Console traffic. They answer
different questions and must remain separate dashboard series.

## First finding if the current production state is unchanged

If the page URL returns the portfolio shell rather than the intended insight,
create a `technical` finding with high priority:

> The production route is serving the portfolio application shell instead of
> the SEO-vs-AEO answer page, so citation testing would measure the wrong
> document.

Suggested action: publish the answer-page route in the portfolio deployment,
then rerun the page-integrity check before running the fixed prompt set.
