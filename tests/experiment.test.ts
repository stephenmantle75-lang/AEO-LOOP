import { describe, expect, it } from "vitest";
import { parseExperimentRequest } from "../src/lib/experiment";

describe("manual experiment request", () => {
  it("accepts an approved topic key", () => {
    expect(parseExperimentRequest({ topicKey: "self-improving-website" })).toEqual({
      ok: true,
      topicKey: "self-improving-website",
    });
  });

  it("rejects arbitrary URLs and prompts at the boundary", () => {
    expect(parseExperimentRequest({ topicKey: "https://example.com" })).toMatchObject({
      ok: false,
      code: "INVALID_TOPIC",
    });
    expect(parseExperimentRequest({ prompt: "run anything" })).toMatchObject({
      ok: false,
      code: "INVALID_TOPIC",
    });
  });

  it("rejects unknown topic keys", () => {
    expect(parseExperimentRequest({ topicKey: "unknown-topic" })).toEqual({
      ok: false,
      code: "INVALID_TOPIC",
      message: "topicKey must identify an approved experiment topic",
    });
  });
});
