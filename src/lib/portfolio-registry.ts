import { createHash } from "node:crypto";

export const canonicalPortfolioOrigin = "https://www.stephenmantle.com";
export const defaultPortfolioSitemapUrl = `${canonicalPortfolioOrigin}/sitemap.xml`;

const monitoredPathPrefixes = ["/notes/", "/insights/"] as const;
const acceptedPortfolioHosts = new Set([
  "www.stephenmantle.com",
  "stephenmantle.com",
  "stephenmantle-portfolio.vercel.app",
]);

export type PortfolioPageType = "note" | "insight";

export type PortfolioPage = {
  pageKey: string;
  path: string;
  url: string;
  pageType: PortfolioPageType;
  priority: "high" | "standard";
};

export type PortfolioReadiness = {
  status: "ready" | "needs_attention" | "failed";
  score: number;
  passedChecks: string[];
  failedChecks: string[];
};

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function normalisePath(value: string): string | null {
  try {
    const url = new URL(value, canonicalPortfolioOrigin);
    const path = url.pathname.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
    return path.startsWith("/") ? path : `/${path}`;
  } catch {
    return null;
  }
}

function normalisePortfolioUrl(value: string): { path: string; url: string } | null {
  try {
    const parsed = new URL(value, canonicalPortfolioOrigin);
    if (!acceptedPortfolioHosts.has(parsed.hostname.toLowerCase())) return null;
    const path = normalisePath(parsed.pathname);
    if (!path) return null;
    parsed.protocol = "https:";
    parsed.hostname = new URL(canonicalPortfolioOrigin).hostname;
    parsed.search = "";
    parsed.hash = "";
    parsed.pathname = path;
    return { path, url: parsed.toString().replace(/\/$/, "") };
  } catch {
    return null;
  }
}

function isMonitoredPath(path: string): boolean {
  return monitoredPathPrefixes.some((prefix) => path.startsWith(prefix) && path.length > prefix.length);
}

function pageTypeForPath(path: string): PortfolioPageType {
  return path.startsWith("/insights/") ? "insight" : "note";
}

/** Extract raw sitemap locations without making network requests. */
export function parseSitemapUrls(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => decodeHtml(match[1]));
}

/** Build stable page entries from the portfolio sitemap or another source-derived URL list. */
export function buildPortfolioPageRegistry(urls: string[]): PortfolioPage[] {
  const pages = new Map<string, PortfolioPage>();
  for (const rawUrl of urls) {
    const normalised = normalisePortfolioUrl(rawUrl);
    if (!normalised || !isMonitoredPath(normalised.path) || pages.has(normalised.path)) continue;
    const pageType = pageTypeForPath(normalised.path);
    pages.set(normalised.path, {
      pageKey: `portfolio:${normalised.path}`,
      path: normalised.path,
      url: normalised.url,
      pageType,
      priority: pageType === "insight" ? "high" : "standard",
    });
  }
  return [...pages.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function firstMatch(html: string, pattern: RegExp): string | undefined {
  return html.match(pattern)?.[1]?.trim();
}

function metaContent(html: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return firstMatch(html, new RegExp(`<meta\\s+[^>]*name=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i"))
    ?? firstMatch(html, new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*name=["']${escaped}["'][^>]*>`, "i"));
}

function canonicalUrl(html: string): string | undefined {
  return firstMatch(html, /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
    ?? firstMatch(html, /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
}

function hasJsonLd(html: string): boolean {
  return /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i.test(html);
}

function hasAuthorshipAndDate(html: string): boolean {
  const hasAuthor = /(?:author|byline|Stephen\s+Mantle)/i.test(html);
  const hasDate = /(?:datePublished|dateModified|datetime=|\b20\d{2}-\d{2}-\d{2}\b)/i.test(html);
  return hasAuthor && hasDate;
}

function samePage(left: string, right: string): boolean {
  const a = normalisePortfolioUrl(left);
  const b = normalisePortfolioUrl(right);
  return Boolean(a && b && a.path === b.path);
}

/** Assess only deterministic page signals; citation results belong to provider observations. */
export function assessPortfolioPageHtml(html: string, targetUrl: string): PortfolioReadiness {
  const checks: Array<[string, boolean]> = [
    ["title", /<title>\s*[^<\s][\s\S]*?<\/title>/i.test(html)],
    ["description", Boolean(metaContent(html, "description"))],
    ["canonical", Boolean(canonicalUrl(html) && samePage(canonicalUrl(html)!, targetUrl))],
    ["robots", !/noindex/i.test(metaContent(html, "robots") ?? "")],
    ["heading", /<h1\b[^>]*>\s*[^<\s][\s\S]*?<\/h1>/i.test(html) && /<h2\b/i.test(html)],
    ["answer_structure", /<(?:main|article)\b/i.test(html) && /<p\b[^>]*>\s*[^<\s][\s\S]*?<\/p>/i.test(html)],
    ["authorship_date", hasAuthorshipAndDate(html)],
    ["structured_data", hasJsonLd(html)],
  ];
  const passedChecks = checks.filter(([, passed]) => passed).map(([name]) => name);
  const failedChecks = checks.filter(([, passed]) => !passed).map(([name]) => name);
  const score = Math.round((passedChecks.length / checks.length) * 100);
  return { status: failedChecks.length === 0 ? "ready" : "needs_attention", score, passedChecks, failedChecks };
}

export function pageRegistryDigest(pages: PortfolioPage[]): string {
  return createHash("sha256").update(JSON.stringify(pages)).digest("hex").slice(0, 16);
}
