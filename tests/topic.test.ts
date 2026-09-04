import { describe, expect, it } from "vitest";
import { dailyComparisonKey, dailyPromptLimit, defaultAeoTargetUrl, defaultAeoVariantTargetUrl, experimentPromptLimit, experimentRunKey, knownTopics, normalizeAeoTargetUrl, promptLimit, seoVsAeoTopic, seoVsAeoVariantTopic, topicForKey } from "../src/lib/topic";

describe("topic contract", () => {
  it("defaults to the public portfolio answer page", () => {
    expect(defaultAeoTargetUrl).toBe(
      "https://www.stephenmantle.com/insights/seo-vs-aeo-portfolio",
    );
  });

  it("normalizes retired and apex portfolio hosts to the canonical live host", () => {
    expect(normalizeAeoTargetUrl(
      "https://stephenmantle-portfolio.vercel.app/insights/seo-vs-aeo-portfolio",
      defaultAeoTargetUrl,
    )).toBe(defaultAeoTargetUrl);
    expect(normalizeAeoTargetUrl(
      "https://stephenmantle.com/insights/seo-vs-aeo-portfolio",
      defaultAeoTargetUrl,
    )).toBe(defaultAeoTargetUrl);
    expect(normalizeAeoTargetUrl(
      "https://unexpected-host.example/insights/seo-vs-aeo-portfolio",
      defaultAeoTargetUrl,
    )).toBe(defaultAeoTargetUrl);
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

  it("uses a three-prompt daily coverage default and allows a bounded override", () => {
    delete process.env.AEO_DAILY_EXA_PROMPTS;
    expect(dailyPromptLimit(seoVsAeoTopic)).toHaveLength(3);
    process.env.AEO_DAILY_EXA_PROMPTS = "999";
    expect(dailyPromptLimit(seoVsAeoTopic)).toHaveLength(10);
    process.env.AEO_DAILY_EXA_PROMPTS = "1";
    expect(dailyPromptLimit(seoVsAeoTopic)).toHaveLength(1);
    delete process.env.AEO_DAILY_EXA_PROMPTS;
  });

  it("uses the complete fixed prompt set for manual experiment runs by default", () => {
    delete process.env.AEO_EXPERIMENT_MAX_EXA_PROMPTS;
    expect(experimentPromptLimit(seoVsAeoTopic)).toHaveLength(10);
    expect(experimentPromptLimit(seoVsAeoVariantTopic)).toEqual(experimentPromptLimit(seoVsAeoTopic));
  });

  it("bounds the manual experiment prompt override without changing the daily default", () => {
    process.env.AEO_EXPERIMENT_MAX_EXA_PROMPTS = "2";
    expect(experimentPromptLimit(seoVsAeoTopic)).toHaveLength(2);
    delete process.env.AEO_EXPERIMENT_MAX_EXA_PROMPTS;
    delete process.env.AEO_MAX_EXA_PROMPTS;
    expect(promptLimit(seoVsAeoTopic)).toHaveLength(1);
  });

  it("exposes only the approved portfolio experiment topics", () => {
    expect(knownTopics.map((topic) => topic.key)).toEqual([
      "seo-vs-aeo-portfolio",
      "seo-vs-aeo-portfolio-variant-b",
      "self-improving-website",
      "github-linear-slack-website-loop",
    ]);
    expect(defaultAeoVariantTargetUrl).toBe(
      "https://www.stephenmantle.com/insights/seo-vs-aeo-portfolio-variant-b",
    );
    expect(seoVsAeoVariantTopic.targetUrl).toBe(defaultAeoVariantTargetUrl);
    expect(seoVsAeoVariantTopic.prompts).toEqual(seoVsAeoTopic.prompts);
    expect(topicForKey("seo-vs-aeo-portfolio-variant-b")?.question).toBe(seoVsAeoTopic.question);
    const selfImprovingWebsite = topicForKey("self-improving-website");
    expect(selfImprovingWebsite).not.toBeNull();
    expect(selfImprovingWebsite?.targetUrl).toContain("/insights/self-improving-website");
    expect(topicForKey("unknown-topic")).toBeNull();
  });

  it("creates unique, auditable experiment run keys", () => {
    const first = experimentRunKey("self-improving-website", "2026-08-29T08:00:00.000Z", "run-a");
    const second = experimentRunKey("self-improving-website", "2026-08-29T08:00:00.000Z", "run-b");

    expect(first).toBe("experiment:self-improving-website:2026-08-29T08:00:00.000Z:run-a");
    expect(second).not.toBe(first);
  });

  it("creates a deterministic key that links the scheduled control and variant runs", () => {
    expect(dailyComparisonKey("2026-08-30")).toBe("seo-vs-aeo:daily:2026-08-30");
  });
});
