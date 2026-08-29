import { describe, expect, it, vi } from "vitest";
import { heartbeatState, staleRunCount } from "../src/lib/observatory";
import { touchRunHeartbeat } from "../src/lib/runs";

describe("run heartbeat", () => {
  it("touches only the running run record", async () => {
    const chain = {
      eq: vi.fn(),
    };
    chain.eq.mockReturnValue(chain);
    const update = vi.fn().mockReturnValue(chain);
    const client = {
      from: vi.fn().mockReturnValue({ update }),
    } as never;

    await touchRunHeartbeat(client, "run-123");

    expect(update).toHaveBeenCalledWith({ heartbeat_at: expect.any(String) });
    expect(chain.eq).toHaveBeenNthCalledWith(1, "id", "run-123");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "status", "running");
  });

  it("classifies running heartbeat freshness without relying on color alone", () => {
    const now = Date.parse("2026-08-29T22:00:00.000Z");
    expect(heartbeatState("running", "2026-08-29T21:59:30.000Z", now)).toMatchObject({ state: "live" });
    expect(heartbeatState("running", "2026-08-29T21:59:14.000Z", now)).toMatchObject({ state: "stale" });
    expect(heartbeatState("running", null, now)).toMatchObject({ state: "awaiting" });
    expect(heartbeatState("succeeded", "2026-08-29T21:59:14.000Z", now)).toMatchObject({ state: "closed" });
  });

  it("counts only running records whose heartbeat is stale", () => {
    const now = Date.parse("2026-08-29T22:00:00.000Z");
    expect(staleRunCount([
      { status: "running", heartbeat_at: "2026-08-29T21:59:00.000Z" },
      { status: "running", heartbeat_at: "2026-08-29T21:59:30.000Z" },
      { status: "succeeded", heartbeat_at: "2026-08-29T21:58:00.000Z" },
      { status: "running", heartbeat_at: null },
    ], now)).toBe(1);
  });
});
