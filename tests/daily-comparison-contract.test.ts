import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("daily comparison contract", () => {
  it("wires the scheduled route to the paired control and Variant B collector", async () => {
    const [route, manualRoute, collection, vercel] = await Promise.all([
      readFile("src/app/api/cron/daily-observation/route.ts", "utf8"),
      readFile("src/app/api/runs/comparison/route.ts", "utf8"),
      readFile("src/lib/collection.ts", "utf8"),
      readFile("vercel.json", "utf8"),
    ]);

    expect(route).toContain("runDailyComparison");
    expect(route).toContain('runType: "daily_comparison"');
    expect(collection).toContain("seoVsAeoVariantTopic");
    expect(collection).toContain('runType: "experiment_retest"');
    expect(collection).toContain("dailyComparisonKey");
    expect(collection).toContain("runPairedExperimentObservation");
    expect(collection).toContain("experimentPromptLimit");
    expect(collection).toContain("dailyPromptLimit");
    expect(collection).toContain("promptLimitOverride");
    expect(collection).toContain("comparisonRole");
    expect(manualRoute).toContain("runPairedExperimentObservation");
    expect(manualRoute).toContain('runType: "paired_experiment"');
    expect(vercel).toContain('"path": "/api/cron/daily-observation"');
  });
});
