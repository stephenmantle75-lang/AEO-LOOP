import { describe, expect, it } from "vitest";
import { getServerEnv } from "../src/lib/env";

describe("server environment", () => {
  it("fails closed when the service role key is absent", () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => getServerEnv()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });
});
