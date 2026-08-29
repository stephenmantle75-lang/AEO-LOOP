import { describe, expect, it } from "vitest";
import { reportingDateKey, reportingTimeZone } from "../src/lib/reporting-clock";
import { isMonthlyBudgetExhausted, parseMonthlyProviderBudgetUsd, utcMonthWindow } from "../src/lib/budget";

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

  it("parses only non-negative monthly budgets", () => {
    expect(parseMonthlyProviderBudgetUsd("1.25")).toBe(1.25);
    expect(parseMonthlyProviderBudgetUsd("-1")).toBeUndefined();
    expect(parseMonthlyProviderBudgetUsd("not-a-number")).toBeUndefined();
  });

  it("uses a deterministic UTC month window and hard-stop comparison", () => {
    expect(utcMonthWindow(new Date("2026-08-28T23:30:00.000Z"))).toEqual({
      start: "2026-08-01T00:00:00.000Z",
      end: "2026-09-01T00:00:00.000Z",
    });
    expect(isMonthlyBudgetExhausted(1, 1)).toBe(true);
    expect(isMonthlyBudgetExhausted(0.99, 1)).toBe(false);
  });
});
