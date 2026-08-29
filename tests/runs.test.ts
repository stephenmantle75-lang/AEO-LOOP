import { describe, expect, it, vi } from "vitest";
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
});
