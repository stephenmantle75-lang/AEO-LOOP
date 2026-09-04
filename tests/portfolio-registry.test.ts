import { describe, expect, it } from "vitest";
import {
  assessPortfolioPageHtml,
  buildPortfolioPageRegistry,
  pageRegistryDigest,
  parseSitemapUrls,
} from "../src/lib/portfolio-registry";
import { portfolioCheckRows, portfolioPageRows } from "../src/lib/portfolio-baseline";

const canonicalOrigin = "https://www.stephenmantle.com";

describe("portfolio page registry", () => {
  it("extracts and deduplicates sitemap locations", () => {
    const xml = `
      <urlset>
        <url><loc>https://www.stephenmantle.com/notes/one</loc></url>
        <url><loc> https://www.stephenmantle.com/notes/one#fragment </loc></url>
        <url><loc>https://www.stephenmantle.com/contact</loc></url>
      </urlset>
    `;

    expect(parseSitemapUrls(xml)).toEqual([
      "https://www.stephenmantle.com/notes/one",
      "https://www.stephenmantle.com/notes/one#fragment",
      "https://www.stephenmantle.com/contact",
    ]);
  });

  it("keeps only public Notes and insight pages and creates stable entries", () => {
    const registry = buildPortfolioPageRegistry([
      "https://stephenmantle.com/notes/one",
      "https://www.stephenmantle.com/insights/two/",
      "https://www.stephenmantle.com/contact",
      "https://example.com/notes/foreign",
      "https://www.stephenmantle.com/notes/one",
    ]);

    expect(registry).toEqual([
      {
        pageKey: "portfolio:/insights/two",
        path: "/insights/two",
        url: "https://www.stephenmantle.com/insights/two",
        pageType: "insight",
        priority: "high",
      },
      {
        pageKey: "portfolio:/notes/one",
        path: "/notes/one",
        url: "https://www.stephenmantle.com/notes/one",
        pageType: "note",
        priority: "standard",
      },
    ]);
  });

  it("reports a complete page-readiness result for a well-formed page", () => {
    const html = `
      <html>
        <head>
          <title>How to improve a website</title>
          <meta name="description" content="A practical guide to improving a website.">
          <link rel="canonical" href="${canonicalOrigin}/notes/improve">
          <meta name="robots" content="index,follow">
          <script type="application/ld+json">{"@type":"Article","author":{"name":"Stephen Mantle"},"datePublished":"2026-09-04"}</script>
        </head>
        <body><main><article><h1>How to improve a website</h1><h2>What matters first</h2><p>Start with a clear answer and evidence.</p><time datetime="2026-09-04">4 September 2026</time></article></main></body>
      </html>
    `;

    const result = assessPortfolioPageHtml(html, `${canonicalOrigin}/notes/improve`);

    expect(result.status).toBe("ready");
    expect(result.score).toBe(100);
    expect(result.failedChecks).toEqual([]);
  });

  it("identifies missing canonical, metadata, structure, and noindex failures", () => {
    const result = assessPortfolioPageHtml(
      `<html><head><title>Thin page</title><meta name="robots" content="noindex"></head><body><p>Short.</p></body></html>`,
      `${canonicalOrigin}/notes/thin`,
    );

    expect(result.status).toBe("needs_attention");
    expect(result.score).toBeLessThan(100);
    expect(result.failedChecks).toEqual([
      "description",
      "canonical",
      "robots",
      "heading",
      "answer_structure",
      "authorship_date",
      "structured_data",
    ]);
  });

  it("creates stable persistence rows from a discovered baseline", () => {
    const pages = buildPortfolioPageRegistry([`${canonicalOrigin}/notes/one`]);
    const result = {
      checkedAt: "2026-09-04T12:00:00.000Z",
      sitemapUrl: `${canonicalOrigin}/sitemap.xml`,
      registryDigest: pageRegistryDigest(pages),
      pages,
      checks: [{
        pageKey: pages[0].pageKey,
        url: pages[0].url,
        httpStatus: 200,
        status: "needs_attention" as const,
        score: 50,
        passedChecks: ["title"],
        failedChecks: ["description"],
      }],
    };

    expect(portfolioPageRows(result)[0]).toMatchObject({
      page_key: "portfolio:/notes/one",
      registry_digest: result.registryDigest,
      active: true,
    });
    expect(portfolioCheckRows(result)[0]).toMatchObject({
      page_key: "portfolio:/notes/one",
      checked_at: result.checkedAt,
      status: "needs_attention",
      score: 50,
    });
  });
});
