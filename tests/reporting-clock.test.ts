import { describe, expect, it } from "vitest";
import { reportingDateKey, reportingTimeZone } from "../src/lib/reporting-clock";

describe("reporting clock", () => {
  const boundary = new Date("2026-08-28T23:30:00.000Z");

  it("uses the configured local calendar date", () => {
    expect(reportingDateKey(boundary, "Europe/Dublin")).toBe("2026-08-29");
    expect(reportingDateKey(boundary, "UTC")).toBe("2026-08-28");
  });

  it("trims a configured timezone", () => {
    expect(reportingTimeZone(" Europe/Dublin ")).toBe("Europe/Dublin");
  });

  it("falls back to UTC for an invalid timezone", () => {
    expect(reportingTimeZone("not/a-zone")).toBe("UTC");
    expect(reportingDateKey(boundary, "not/a-zone")).toBe("2026-08-28");
  });
});
