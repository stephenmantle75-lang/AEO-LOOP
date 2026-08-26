import { describe, expect, it } from "vitest";
import { defaultAeoTargetUrl, promptLimit, seoVsAeoTopic } from "../src/lib/topic";

describe("topic contract", () => {
  it("defaults to the public portfolio answer page", () => {
    expect(defaultAeoTargetUrl).toBe(
      "https://stephenmantle-portfolio.vercel.app/insights/seo-vs-aeo-portfolio",
    );
  });

  it("keeps the fixed prompt set intact by default", () => {
    delete process.env.AEO_MAX_EXA_PROMPTS;
    expect(promptLimit(seoVsAeoTopic)).toHaveLength(1);
    expect(seoVsAeoTopic.prompts).toHaveLength(10);
  });

  it("bounds configured prompt counts to the contract", () => {
    process.env.AEO_MAX_EXA_PROMPTS = "999";
    expect(promptLimit(seoVsAeoTopic)).toHaveLength(10);
    process.env.AEO_MAX_EXA_PROMPTS = "0";
    expect(promptLimit(seoVsAeoTopic)).toHaveLength(1);
    delete process.env.AEO_MAX_EXA_PROMPTS;
  });
});
