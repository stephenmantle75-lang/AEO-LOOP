import { describe, expect, it, vi } from "vitest";
import { apiErrorResponse, logServerError } from "../src/lib/api-response";

describe("API error responses", () => {
  it("returns a stable no-store error contract", async () => {
    const response = apiErrorResponse("COLLECTION_FAILED", "Collection failed", 500);

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: { code: "COLLECTION_FAILED", message: "Collection failed" },
    });
  });

  it("logs only safe error classification", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logServerError("Collection failed", new Error("provider secret must not be exposed"));

    expect(spy).toHaveBeenCalledWith("Collection failed", { name: "Error", type: "object" });
    expect(JSON.stringify(spy.mock.calls)).not.toContain("provider secret");
    spy.mockRestore();
  });
});
