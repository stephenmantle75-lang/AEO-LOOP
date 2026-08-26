# Controlled answer pages

The first measurement slice uses three public pages in the AEO Loop Vercel
app. They are intentionally small, stable, and written for people first. The
same URLs are used for repeated provider checks so changes can be compared.

| Topic | Route | Measurement intent |
| --- | --- | --- |
| Self-improving websites | `/insights/self-improving-websites` | Test whether the loop can be clearly explained without implying unsupervised production edits. |
| GitHub, Linear, and Slack workflows | `/insights/github-linear-slack-workflows` | Test whether the tool responsibilities and automation boundary are understandable. |
| SEO vs AEO for portfolios | `/insights/seo-vs-aeo-portfolio` | Test whether a portfolio-focused explanation distinguishes discovery from citation. |

## Page contract

Every page must have:

- a stable, crawlable route that returns HTTP 200;
- a route-specific title and description;
- a direct answer near the top of the document;
- semantic headings, readable paragraphs, and a short FAQ section;
- Article and FAQ structured data that matches the visible page;
- an author and last-updated date;
- links to the other insight pages and the Observatory;
- no private provider payloads, credentials, visitor-level data, or invented results.

The pages are public inputs for measurement. They are not the dashboard's
evidence records and they do not claim that a citation has been won.

## Fixed prompt set

Use the following prompt for the matching topic on each run. The existing
SEO-vs-AEO experiment retains its ten-question prompt set for deeper retests.

1. What is a safe way for a website to improve itself over time?
2. How should GitHub, Linear, and Slack work together in an AI workflow?
3. What is the difference between SEO and AEO for a personal portfolio?

For each prompt, store the exact text, provider, target URL, timestamp, region,
response status, returned URLs, and confidence. Do not combine provider
visibility with Search Console or human traffic.

## Verification before baseline

Before calling the first baseline valid:

1. Verify all three routes return HTTP 200 after redirects.
2. Verify each response contains the intended title, direct answer, canonical,
   and matching structured data.
3. Run the matching fixed prompt through the configured provider.
4. Store the run and normalized observation in Supabase.
5. Keep the control topic unchanged for the comparison window.
