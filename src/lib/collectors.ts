import { getServerEnv } from "./env";

export type Citation = { url: string; title?: string; position?: number };

export type PageObservation = {
  status: "observed" | "failed" | "skipped";
  answerText?: string;
  citationUrls: string[];
  citations: Citation[];
  metrics: Record<string, unknown>;
  sourceUrl?: string;
  confidence?: number;
  errorMessage?: string;
};

type JsonRecord = Record<string, unknown>;

const MAX_PROVIDER_ATTEMPTS = 2;
const RETRY_DELAY_MS = 250;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Keep provider-returned links safe to store and render as external citations. */
export function sanitizeCitationUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 2048) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function sanitizeCitations(citations: Citation[]): Citation[] {
  return citations.flatMap((citation) => {
    const url = sanitizeCitationUrl(citation.url);
    return url ? [{ ...citation, url }] : [];
  });
}

function urlMatches(targetUrl: string, candidate: string): boolean {
  try {
    const target = new URL(targetUrl);
    const candidateUrl = new URL(candidate);
    return target.origin === candidateUrl.origin && target.pathname.replace(/\/$/, "") === candidateUrl.pathname.replace(/\/$/, "");
  } catch {
    return candidate.includes(targetUrl);
  }
}

function timeoutSignal(milliseconds: number): AbortSignal {
  return AbortSignal.timeout(milliseconds);
}

export function isRetryableProviderStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function retryDelay(attempt: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
}

type RetriedResponse = { response: Response; attempts: number };

async function fetchWithRetry(url: string, init: RequestInit, timeoutMs: number): Promise<RetriedResponse> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_PROVIDER_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: timeoutSignal(timeoutMs) });
      if (attempt < MAX_PROVIDER_ATTEMPTS && isRetryableProviderStatus(response.status)) {
        await retryDelay(attempt);
        continue;
      }
      return { response, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_PROVIDER_ATTEMPTS) await retryDelay(attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Provider request failed after retries");
}

export async function scrapeTargetPage(targetUrl: string): Promise<PageObservation> {
  const apiKey = getServerEnv().firecrawlApiKey;
  if (!apiKey) {
    return {
      status: "skipped",
      citationUrls: [],
      citations: [],
      metrics: { configured: false },
      errorMessage: "FIRECRAWL_API_KEY is not configured",
    };
  }

  let attempts = 0;
  try {
    const retried = await fetchWithRetry("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: targetUrl, formats: ["markdown", "links"], onlyMainContent: true, timeout: 60000 }),
    }, 70000);
    attempts = retried.attempts;
    const response = retried.response;
    const payload: unknown = await response.json();
    if (!response.ok || !isRecord(payload) || payload.success !== true) {
      return { status: "failed", citationUrls: [], citations: [], metrics: { httpStatus: response.status, attempts, retryCount: attempts - 1 }, errorMessage: `Firecrawl request failed with HTTP ${response.status}` };
    }

    const data = isRecord(payload.data) ? payload.data : {};
    const metadata = isRecord(data.metadata) ? data.metadata : {};
    const markdown = text(data.markdown) ?? "";
    const rawLinks = Array.isArray(data.links) ? data.links.filter((item): item is string => typeof item === "string") : [];
    const links = rawLinks.flatMap((link) => {
      const safeUrl = sanitizeCitationUrl(link);
      return safeUrl ? [safeUrl] : [];
    });
    const statusCode = typeof metadata.statusCode === "number" ? metadata.statusCode : undefined;
    const title = text(metadata.title);
    const description = text(metadata.description);
    const intendedPage = markdown.length > 0 || Boolean(title);

    return {
      status: statusCode === 200 && intendedPage ? "observed" : "failed",
      answerText: markdown.slice(0, 12000),
      citationUrls: links,
      citations: links.slice(0, 50).map((url, position) => ({ url, position: position + 1 })),
      sourceUrl: targetUrl,
      confidence: statusCode === 200 && intendedPage ? 1 : 0,
      metrics: { configured: true, statusCode, title, description, contentCharacters: markdown.length, linkCount: links.length, rejectedLinkCount: rawLinks.length - links.length, attempts, retryCount: attempts - 1 },
      ...(statusCode === 200 && intendedPage ? {} : { errorMessage: "Target page did not return an inspectable document" }),
    };
  } catch (error) {
    const retryCount = Math.max(0, attempts - 1);
    return { status: "failed", citationUrls: [], citations: [], metrics: { attempts: attempts || 1, retryCount }, errorMessage: error instanceof Error ? error.message : "Unknown Firecrawl error" };
  }
}

export async function searchWithExa(prompt: string, targetUrl: string): Promise<PageObservation> {
  const apiKey = getServerEnv().exaApiKey;
  if (!apiKey) {
    return { status: "skipped", citationUrls: [], citations: [], metrics: { configured: false }, errorMessage: "EXA_API_KEY is not configured" };
  }

  let attempts = 0;
  try {
    const retried = await fetchWithRetry("https://api.exa.ai/search", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ query: prompt, type: "fast", numResults: 10, contents: { highlights: true } }),
    }, 30000);
    attempts = retried.attempts;
    const response = retried.response;
    const payload: unknown = await response.json();
    if (!response.ok || !isRecord(payload)) {
      return { status: "failed", citationUrls: [], citations: [], metrics: { httpStatus: response.status, attempts, retryCount: attempts - 1 }, errorMessage: `Exa request failed with HTTP ${response.status}` };
    }

    const results = Array.isArray(payload.results) ? payload.results.filter(isRecord) : [];
    const rawCitations = results.flatMap((result, index) => {
      const url = text(result.url);
      return url ? [{ url, title: text(result.title), position: index + 1 }] : [];
    });
    const citations = sanitizeCitations(rawCitations);
    const answerText = results
      .flatMap((result) => (Array.isArray(result.highlights) ? result.highlights.filter((item): item is string => typeof item === "string") : []))
      .join("\n\n")
      .slice(0, 12000);
    const citationFound = citations.some((citation) => urlMatches(targetUrl, citation.url));
    const matchedCitation = citations.find((citation) => urlMatches(targetUrl, citation.url));
    const output = isRecord(payload.output) ? payload.output : {};
    const grounding = Array.isArray(output.grounding) ? output.grounding.filter(isRecord) : [];
    const groundedCitations = grounding.flatMap((item) => (Array.isArray(item.citations) ? item.citations.filter(isRecord) : []));
    const groundedUrls = groundedCitations.flatMap((item) => {
      const url = sanitizeCitationUrl(item.url);
      return url ? [url] : [];
    });

    return {
      status: "observed",
      answerText,
      citationUrls: [...new Set([...citations.map((citation) => citation.url), ...groundedUrls])],
      citations,
      metrics: {
        configured: true,
        resultCount: results.length,
        citationFound,
        targetResultPosition: matchedCitation?.position ?? null,
        targetResultTitle: matchedCitation?.title ?? null,
        retrieval: "exa_search_result",
        rejectedCitationCount: rawCitations.length - citations.length,
        requestId: text(payload.requestId),
        costDollars: isRecord(payload.costDollars) ? payload.costDollars : undefined,
        attempts,
        retryCount: attempts - 1,
      },
      confidence: results.length > 0 ? 0.8 : 0.2,
    };
  } catch (error) {
    const retryCount = Math.max(0, attempts - 1);
    return { status: "failed", citationUrls: [], citations: [], metrics: { attempts: attempts || 1, retryCount }, errorMessage: error instanceof Error ? error.message : "Unknown Exa error" };
  }
}
