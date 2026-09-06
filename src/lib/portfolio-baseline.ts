import {
  assessPortfolioPageHtml,
  buildPortfolioPageRegistry,
  defaultPortfolioSitemapUrl,
  pageRegistryDigest,
  parseSitemapUrls,
  type PortfolioPage,
  type PortfolioReadiness,
} from "./portfolio-registry";

const SITEMAP_TIMEOUT_MS = 15_000;
const PAGE_TIMEOUT_MS = 20_000;
const DEFAULT_CONCURRENCY = 3;

export type PortfolioBaselineResult = {
  checkedAt: string;
  sitemapUrl: string;
  registryDigest: string;
  pages: PortfolioPage[];
  checks: Array<PortfolioReadiness & { pageKey: string; url: string; httpStatus: number | null; errorMessage?: string }>;
};

function timeoutSignal(milliseconds: number): AbortSignal {
  return AbortSignal.timeout(milliseconds);
}

async function fetchText(url: string, timeoutMs: number): Promise<{ status: number; text: string }> {
  const response = await fetch(url, { signal: timeoutSignal(timeoutMs), headers: { Accept: "text/html,application/xml" } });
  return { status: response.status, text: await response.text() };
}

export async function discoverPortfolioPages(sitemapUrl = defaultPortfolioSitemapUrl): Promise<{ sitemapUrl: string; pages: PortfolioPage[]; registryDigest: string }> {
  const sitemap = await fetchText(sitemapUrl, SITEMAP_TIMEOUT_MS);
  if (sitemap.status < 200 || sitemap.status >= 300) {
    throw new Error(`Portfolio sitemap failed with HTTP ${sitemap.status}`);
  }
  const pages = buildPortfolioPageRegistry(parseSitemapUrls(sitemap.text));
  if (pages.length === 0) throw new Error("Portfolio sitemap contained no monitored Notes or insight pages");
  return { sitemapUrl, pages, registryDigest: pageRegistryDigest(pages) };
}

async function checkPage(page: PortfolioPage): Promise<PortfolioBaselineResult["checks"][number]> {
  try {
    const response = await fetchText(page.url, PAGE_TIMEOUT_MS);
    if (response.status < 200 || response.status >= 300) {
      return {
        pageKey: page.pageKey,
        url: page.url,
        httpStatus: response.status,
        status: "failed",
        score: 0,
        passedChecks: [],
        failedChecks: ["http"],
        errorMessage: `Portfolio page failed with HTTP ${response.status}`,
      };
    }
    return { pageKey: page.pageKey, url: page.url, httpStatus: response.status, ...assessPortfolioPageHtml(response.text, page.url) };
  } catch {
    return {
      pageKey: page.pageKey,
      url: page.url,
      httpStatus: null,
      status: "failed",
      score: 0,
      passedChecks: [],
      failedChecks: ["http"],
      errorMessage: "Portfolio page request failed or timed out",
    };
  }
}

async function mapWithConcurrency<T, R>(items: T[], worker: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;
  async function consume(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(concurrency, 1), items.length) }, () => consume()));
  return results;
}

export async function runPortfolioBaseline(sitemapUrl = defaultPortfolioSitemapUrl, concurrency = DEFAULT_CONCURRENCY): Promise<PortfolioBaselineResult> {
  const discovered = await discoverPortfolioPages(sitemapUrl);
  const checks = await mapWithConcurrency(discovered.pages, checkPage, concurrency);
  return { checkedAt: new Date().toISOString(), ...discovered, checks };
}

export function portfolioPageRows(result: PortfolioBaselineResult) {
  return result.pages.map((page) => ({
    page_key: page.pageKey,
    path: page.path,
    url: page.url,
    page_type: page.pageType,
    priority: page.priority,
    active: true,
    source_sitemap_url: result.sitemapUrl,
    registry_digest: result.registryDigest,
    last_seen_at: result.checkedAt,
  }));
}

export function portfolioCheckRows(result: PortfolioBaselineResult) {
  return result.checks.map((check) => ({
    page_key: check.pageKey,
    checked_at: result.checkedAt,
    registry_digest: result.registryDigest,
    status: check.status,
    score: check.score,
    passed_checks: check.passedChecks,
    failed_checks: check.failedChecks,
    http_status: check.httpStatus,
    error_message: check.errorMessage ?? null,
  }));
}
