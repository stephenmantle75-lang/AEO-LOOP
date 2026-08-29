import { describe, expect, it } from "vitest";
import { isSameOrigin, safeNextPath } from "../src/lib/review-access";

describe("review access helpers", () => {
  it("allows an internal next path but rejects an external redirect", () => {
    expect(safeNextPath("/review/run-id")).toBe("/review/run-id");
    expect(safeNextPath("https://example.com")).toBe("/findings");
    expect(safeNextPath("//example.com")).toBe("/findings");
    expect(safeNextPath("/\\\\example.com")).toBe("/findings");
  });

  it("requires a same-origin request for state-changing review actions", () => {
    expect(isSameOrigin(new Request("https://observatory.example/api/analysis/review", { headers: { origin: "https://observatory.example" } }))).toBe(true);
    expect(isSameOrigin(new Request("https://observatory.example/api/analysis/review", { headers: { origin: "https://attacker.example" } }))).toBe(false);
    expect(isSameOrigin(new Request("https://observatory.example/api/analysis/review"))).toBe(false);
  });
});
