import { describe, expect, it } from "vitest";
import { defaultAeoTargetUrl, experimentRunKey, knownTopics, linearSoloBuildersTopic, promptLimit, seoVsAeoTopic, topicForKey } from "../src/lib/topic";

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

  it("exposes the approved portfolio experiment topics", () => {
    expect(knownTopics.map((topic) => topic.key)).toEqual([
      "seo-vs-aeo-portfolio",
      "self-improving-website",
      "github-linear-slack-website-loop",
      "linear-solo-builders-using-ai",
    ]);
    const selfImprovingWebsite = topicForKey("self-improving-website");
    expect(selfImprovingWebsite).not.toBeNull();
    expect(selfImprovingWebsite?.targetUrl).toContain("/insights/self-improving-website");
    expect(topicForKey("unknown-topic")).toBeNull();
  });

  it("registers the Linear Notes page as a separate topic", () => {
    expect(linearSoloBuildersTopic.targetUrl).toBe(
      "https://www.stephenmantle.com/notes/linear-for-solo-builders-using-ai",
    );
    expect(topicForKey("linear-solo-builders-using-ai")?.prompts).toHaveLength(3);
  });

  it("creates unique, auditable experiment run keys", () => {
    const first = experimentRunKey("self-improving-website", "2026-08-29T08:00:00.000Z", "run-a");
    const second = experimentRunKey("self-improving-website", "2026-08-29T08:00:00.000Z", "run-b");

    expect(first).toBe("experiment:self-improving-website:2026-08-29T08:00:00.000Z:run-a");
    expect(second).not.toBe(first);
  });
});
