import { describe, expect, it } from "vitest";
import { isRetryableProviderStatus, sanitizeCitationUrl, sanitizeCitations } from "../src/lib/collectors";

describe("provider citation boundaries", () => {
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
});
