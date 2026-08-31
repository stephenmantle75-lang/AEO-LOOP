import { afterEach, describe, expect, it, vi } from "vitest";
import { isRetryableProviderStatus, sanitizeCitationUrl, sanitizeCitations, scrapeTargetPage, searchWithExa } from "../src/lib/collectors";

describe("provider citation boundaries", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.EXA_API_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("accepts HTTPS URLs and normalizes surrounding whitespace", () => {
    expect(sanitizeCitationUrl("  https://example.com/source  ")).toBe("https://example.com/source");
  });

  it("rejects unsafe schemes, credentials, malformed values, and oversized URLs", () => {
    expect(sanitizeCitationUrl("javascript:alert(1)")).toBeUndefined();
    expect(sanitizeCitationUrl("data:text/html,unsafe")).toBeUndefined();
    expect(sanitizeCitationUrl("http://example.com/source")).toBeUndefined();
    expect(sanitizeCitationUrl("https://user:password@example.com/source")).toBeUndefined();
    expect(sanitizeCitationUrl("not a URL")).toBeUndefined();
    expect(sanitizeCitationUrl(`https://example.com/${"x".repeat(2048)}`)).toBeUndefined();
  });

  it("drops invalid citations while preserving safe citation metadata", () => {
    expect(sanitizeCitations([
      { url: "https://example.com/one", title: "One", position: 1 },
      { url: "javascript:alert(1)", title: "Unsafe", position: 2 },
    ])).toEqual([{ url: "https://example.com/one", title: "One", position: 1 }]);
  });

  it("only retries transient provider responses", () => {
    expect(isRetryableProviderStatus(408)).toBe(true);
    expect(isRetryableProviderStatus(429)).toBe(true);
    expect(isRetryableProviderStatus(503)).toBe(true);
    expect(isRetryableProviderStatus(400)).toBe(false);
    expect(isRetryableProviderStatus(404)).toBe(false);
  });

  it("records the matched search result position for a target URL", async () => {
    process.env.EXA_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      requestId: "exa-test-request",
      results: [
        { url: "https://example.com/other", title: "Other result", highlights: [] },
        { url: "https://example.com/target", title: "Target result", highlights: ["Target highlight"] },
      ],
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    const result = await searchWithExa("test prompt", "https://example.com/target");

    expect(result.metrics).toMatchObject({
      citationFound: true,
      targetResultPosition: 2,
      targetResultTitle: "Target result",
      retrieval: "exa_search_result",
    });
  });

  it("stores a generic message when Exa throws a provider exception", async () => {
    process.env.EXA_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("authorization token=must-not-leak")));

    const result = await searchWithExa("test prompt", "https://example.com/target");

    expect(result.errorMessage).toBe("Exa request failed after retries");
    expect(JSON.stringify(result)).not.toContain("must-not-leak");
  });

  it("stores a generic message when Firecrawl throws a provider exception", async () => {
    process.env.FIRECRAWL_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("secret=must-not-leak")));

    const result = await scrapeTargetPage("https://example.com/target");

    expect(result.errorMessage).toBe("Firecrawl request failed after retries");
    expect(JSON.stringify(result)).not.toContain("must-not-leak");
  });
});
