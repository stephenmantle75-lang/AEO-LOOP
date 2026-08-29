import { describe, expect, it } from "vitest";
import { parseAnalysisPreviewRequest } from "../src/lib/analysis-preview";

describe("analysis preview request", () => {
  it("accepts one canonical run ID", () => {
    expect(parseAnalysisPreviewRequest({ runId: "aa2d10c0-9ce3-4171-ab71-27f6e61057c8" })).toEqual({
      ok: true,
      runId: "aa2d10c0-9ce3-4171-ab71-27f6e61057c8",
    });
  });

  it("rejects missing or malformed run IDs", () => {
    expect(parseAnalysisPreviewRequest({})).toMatchObject({ ok: false, code: "INVALID_RUN" });
    expect(parseAnalysisPreviewRequest({ runId: "latest" })).toMatchObject({ ok: false, code: "INVALID_RUN" });
    expect(parseAnalysisPreviewRequest(null)).toMatchObject({ ok: false, code: "INVALID_RUN" });
  });

  it("trims a valid run ID without accepting extra scope", () => {
    expect(parseAnalysisPreviewRequest({ runId: "  aa2d10c0-9ce3-4171-ab71-27f6e61057c8  ", topicKey: "other-topic" })).toEqual({
      ok: true,
      runId: "aa2d10c0-9ce3-4171-ab71-27f6e61057c8",
    });
  });
});
