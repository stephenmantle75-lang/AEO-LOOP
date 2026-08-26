import { describe, expect, it } from "vitest";
import { promptLimit, seoVsAeoTopic } from "../src/lib/topic";

describe("topic contract", () => {
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
