import { describe, expect, it } from "vitest";
import { deliveryStatusLabel, deliveryStatusTone } from "../src/lib/observatory";

describe("deliveryStatusTone", () => {
  it("maps each real delivery status onto an existing provider-state tone", () => {
    expect(deliveryStatusTone("sent")).toBe("observed");
    expect(deliveryStatusTone("failed")).toBe("failed");
    expect(deliveryStatusTone("queued")).toBe("not-run");
    expect(deliveryStatusTone("processing")).toBe("not-run");
    expect(deliveryStatusTone("cancelled")).toBe("");
    expect(deliveryStatusTone(null)).toBe("");
  });
});

describe("deliveryStatusLabel", () => {
  it("falls back to a plain-language label when no report has been generated", () => {
    expect(deliveryStatusLabel(null)).toBe("not generated");
    expect(deliveryStatusLabel("sent")).toBe("sent");
  });
});
