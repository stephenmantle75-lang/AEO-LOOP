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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
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

  try {
    const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: targetUrl, formats: ["markdown", "links"], onlyMainContent: true, timeout: 60000 }),
      signal: timeoutSignal(70000),
    });
    const payload: unknown = await response.json();
    if (!response.ok || !isRecord(payload) || payload.success !== true) {
      return { status: "failed", citationUrls: [], citations: [], metrics: { httpStatus: response.status }, errorMessage: `Firecrawl request failed with HTTP ${response.status}` };
    }

    const data = isRecord(payload.data) ? payload.data : {};
    const metadata = isRecord(data.metadata) ? data.metadata : {};
    const markdown = text(data.markdown) ?? "";
    const links = Array.isArray(data.links) ? data.links.filter((item): item is string => typeof item === "string") : [];
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
      metrics: { configured: true, statusCode, title, description, contentCharacters: markdown.length, linkCount: links.length },
      ...(statusCode === 200 && intendedPage ? {} : { errorMessage: "Target page did not return an inspectable document" }),
    };
  } catch (error) {
    return { status: "failed", citationUrls: [], citations: [], metrics: {}, errorMessage: error instanceof Error ? error.message : "Unknown Firecrawl error" };
  }
}

export async function searchWithExa(prompt: string, targetUrl: string): Promise<PageObservation> {
  const apiKey = getServerEnv().exaApiKey;
  if (!apiKey) {
    return { status: "skipped", citationUrls: [], citations: [], metrics: { configured: false }, errorMessage: "EXA_API_KEY is not configured" };
  }

  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ query: prompt, type: "fast", numResults: 10, contents: { highlights: true } }),
      signal: timeoutSignal(30000),
    });
    const payload: unknown = await response.json();
    if (!response.ok || !isRecord(payload)) {
      return { status: "failed", citationUrls: [], citations: [], metrics: { httpStatus: response.status }, errorMessage: `Exa request failed with HTTP ${response.status}` };
    }

    const results = Array.isArray(payload.results) ? payload.results.filter(isRecord) : [];
    const citations = results.flatMap((result, index) => {
      const url = text(result.url);
      return url ? [{ url, title: text(result.title), position: index + 1 }] : [];
    });
    const answerText = results
      .flatMap((result) => (Array.isArray(result.highlights) ? result.highlights.filter((item): item is string => typeof item === "string") : []))
      .join("\n\n")
      .slice(0, 12000);
    const citationFound = citations.some((citation) => urlMatches(targetUrl, citation.url));
    const output = isRecord(payload.output) ? payload.output : {};
    const grounding = Array.isArray(output.grounding) ? output.grounding.filter(isRecord) : [];
    const groundedCitations = grounding.flatMap((item) => (Array.isArray(item.citations) ? item.citations.filter(isRecord) : []));
    const groundedUrls = groundedCitations.flatMap((item) => { const url = text(item.url); return url ? [url] : []; });

    return {
      status: "observed",
      answerText,
      citationUrls: [...new Set([...citations.map((citation) => citation.url), ...groundedUrls])],
      citations,
      metrics: { configured: true, resultCount: results.length, citationFound, requestId: text(payload.requestId), costDollars: isRecord(payload.costDollars) ? payload.costDollars : undefined },
      confidence: results.length > 0 ? 0.8 : 0.2,
    };
  } catch (error) {
    return { status: "failed", citationUrls: [], citations: [], metrics: {}, errorMessage: error instanceof Error ? error.message : "Unknown Exa error" };
  }
}
