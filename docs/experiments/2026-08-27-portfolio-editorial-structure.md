# Portfolio editorial structure decision

## Decision

The public portfolio will explain Stephen's work and ideas as a human-facing
portfolio. It will not expose the internal AEO Loop experiment, provider
payloads, citation scores, database records, or operational status as marketing
copy. Those remain reviewable in the separate AEO Loop Observatory dashboard.

The public pages will use a consistent editorial structure for useful insight
pages and case-study explanations:

1. A clear question-led title with author, date, and reading time.
2. A short direct answer near the top of the page.
3. An outline that lets a person scan the argument.
4. An original visual model or diagram that explains the idea.
5. Deeper sections with examples, comparisons, and contextual source links.
6. A visible FAQ where it genuinely helps the reader.
7. Related work and a next-reading path back into the portfolio.

This structure is informed by the Kyenna AEO versus SEO reference and checked
against Google's guidance on helpful content, crawlable links, and structured
data policy. Sources are context for the reader, not a promise of citation
performance.

## What changed locally

The portfolio repository now applies the structure to all three public insight
pages:

- `public/insights/seo-vs-aeo-portfolio/index.html`
- `public/insights/self-improving-website/index.html`
- `public/insights/github-linear-slack-website-loop/index.html`

The main React routes were also aligned with the same hierarchy and tone:
`/`, `/work`, `/about`, `/notes`, and `/work/aeo-growth-loop`. Internal labels,
numbered process language, and the visible experiment note were removed from
the public presentation. The AEO Growth Loop case study still explains the
system when a visitor intentionally opens that project.

## Flow and ownership

```text
visitor question
      |
      v
public portfolio insight or case study
  direct answer -> visual explanation -> examples -> related work
      |
      +--> optional contextual sources for the reader

private measurement boundary
portfolio deployment -> Firecrawl / Exa collection -> Supabase -> Observatory
                                     |
                                     +--> findings and future experiments
```

The public site is the thing answer engines and people can read. The
Observatory is the evidence surface that records what providers returned. A
page change becomes measurable only after the approved portfolio deployment is
updated and the same topic is collected again.

## Validation and deferred work

- Local portfolio production build passes with `pnpm build`.
- `git diff --check` passes.
- Local browser checks confirmed all eight portfolio routes render without a
  404 or application error, and each insight page contains one article, one
  diagram, and one outline.
- No citation uplift is claimed from this local change.
- Push, merge, production deployment, and the next provider measurement remain
  deferred until Stephen reviews and approves the final release.

## References

- https://www.kyenna.com/blog/aeo-vs-seo-whats-the-difference
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/docs/essentials
- https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- https://developers.google.com/search/docs/crawling-indexing/links-crawlable
