import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("approved finding delivery contract", () => {
  it("defines one idempotent delivery intent per finding and channel", async () => {
    const migration = await readFile("supabase/migrations/20260830170000_finding_delivery_intents.sql", "utf8");

    expect(migration).toContain("create table if not exists public.finding_delivery_events");
    expect(migration).toContain("finding_id uuid not null references public.findings");
    expect(migration).toContain("channel text not null");
    expect(migration).toContain("check (channel in ('slack', 'linear', 'zapier'))");
    expect(migration).toContain("unique (finding_id, channel)");
    expect(migration).toContain("unique (event_id, channel)");
    expect(migration).toContain("revoke all on table public.finding_delivery_events from anon, authenticated");
  });

  it("creates delivery intents in the same approval transaction", async () => {
    const deliveryMigration = await readFile("supabase/migrations/20260830170000_finding_delivery_intents.sql", "utf8");

    expect(deliveryMigration).toContain("create trigger findings_queue_delivery_intents");
    expect(deliveryMigration).toContain("insert into public.finding_delivery_events");
    expect(deliveryMigration).toContain("finding.created:");
    expect(deliveryMigration).toContain("on conflict (finding_id, channel) do nothing");
  });

  it("documents that approval queues intent but does not send externally", async () => {
    const [reviewDoc, dataModel] = await Promise.all([
      readFile("docs/analysis-review.md", "utf8"),
      readFile("docs/data-model.md", "utf8"),
    ]);

    expect(reviewDoc).toContain("delivery intent");
    expect(reviewDoc).toContain("does not send Linear, Slack, or Zapier");
    expect(dataModel).toContain("finding_delivery_events");
  });
});
