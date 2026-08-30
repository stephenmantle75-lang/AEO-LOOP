import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deliveryStatusLabel, deliveryStatusTone, reportDeliveryStatusFromClient, type ReportDeliveryStatus } from "../src/lib/observatory";

/** Same thenable-passthrough Supabase mock as tests/slack-delivery.test.ts, scoped to the
 *  .select().eq().maybeSingle() chain reportDeliveryStatusFromClient actually calls. */
function query(result: unknown) {
  const q: any = Promise.resolve(result);
  for (const method of ["select", "eq", "maybeSingle"]) q[method] = () => q;
  return q;
}

function fakeClient(table: Record<string, unknown>): SupabaseClient {
  return {
    from: (name: string) => query(table[name] ?? { data: null, error: null }),
  } as unknown as SupabaseClient;
}

describe("reportDeliveryStatusFromClient", () => {
  it("empty: no report row yet for this run", async () => {
    const client = fakeClient({ reports: { data: null, error: null } });
    expect(await reportDeliveryStatusFromClient(client, "run-1")).toEqual({ reportId: null, status: null, deliveredAt: null, lastError: null, readError: false });
  });

  it("sent: report generated and delivered", async () => {
    const client = fakeClient({
      reports: { data: { id: "report-1" }, error: null },
      report_outbox: { data: { status: "sent", delivered_at: "2026-08-30T08:15:00.000Z", last_error: null }, error: null },
    });
    expect(await reportDeliveryStatusFromClient(client, "run-1")).toEqual({ reportId: "report-1", status: "sent", deliveredAt: "2026-08-30T08:15:00.000Z", lastError: null, readError: false });
  });

  it("delayed: still queued in the outbox", async () => {
    const client = fakeClient({
      reports: { data: { id: "report-2" }, error: null },
      report_outbox: { data: { status: "queued", delivered_at: null, last_error: null }, error: null },
    });
    expect(await reportDeliveryStatusFromClient(client, "run-2")).toEqual({ reportId: "report-2", status: "queued", deliveredAt: null, lastError: null, readError: false });
  });

  it("failed: delivery attempted and failed, with the error recorded", async () => {
    const client = fakeClient({
      reports: { data: { id: "report-3" }, error: null },
      report_outbox: { data: { status: "failed", delivered_at: null, last_error: "Slack API error 500" }, error: null },
    });
    expect(await reportDeliveryStatusFromClient(client, "run-3")).toEqual({ reportId: "report-3", status: "failed", deliveredAt: null, lastError: "Slack API error 500", readError: false });
  });

  it("unavailable: the reports read itself fails", async () => {
    const client = fakeClient({ reports: { data: null, error: { message: "connection refused" } } });
    expect(await reportDeliveryStatusFromClient(client, "run-4")).toEqual({ reportId: null, status: null, deliveredAt: null, lastError: null, readError: true });
  });

  it("unavailable: report found but the outbox read fails", async () => {
    const client = fakeClient({
      reports: { data: { id: "report-5" }, error: null },
      report_outbox: { data: null, error: { message: "timeout" } },
    });
    expect(await reportDeliveryStatusFromClient(client, "run-5")).toEqual({ reportId: "report-5", status: null, deliveredAt: null, lastError: null, readError: true });
  });
});

const withStatus = (status: ReportDeliveryStatus["status"]): ReportDeliveryStatus => ({ reportId: "report-1", status, deliveredAt: null, lastError: null, readError: false });
const readError: ReportDeliveryStatus = { reportId: null, status: null, deliveredAt: null, lastError: null, readError: true };

describe("deliveryStatusTone", () => {
  it("maps each real delivery status onto an existing provider-state tone", () => {
    expect(deliveryStatusTone(withStatus("sent"))).toBe("observed");
    expect(deliveryStatusTone(withStatus("failed"))).toBe("failed");
    expect(deliveryStatusTone(withStatus("queued"))).toBe("not-run");
    expect(deliveryStatusTone(withStatus("processing"))).toBe("not-run");
    expect(deliveryStatusTone(withStatus("cancelled"))).toBe("");
    expect(deliveryStatusTone(null)).toBe("failed");
    expect(deliveryStatusTone(readError)).toBe("failed");
  });
});

describe("deliveryStatusLabel", () => {
  it("falls back to a plain-language label when no report has been generated", () => {
    expect(deliveryStatusLabel(withStatus(null))).toBe("not generated");
    expect(deliveryStatusLabel(withStatus("sent"))).toBe("sent");
  });

  it("flags queued/processing as delayed rather than just echoing the raw status", () => {
    expect(deliveryStatusLabel(withStatus("queued"))).toBe("queued — delayed");
    expect(deliveryStatusLabel(withStatus("processing"))).toBe("processing — delayed");
  });

  it("reports unavailable (not 'not generated') when the read failed or delivery is null", () => {
    expect(deliveryStatusLabel(readError)).toBe("delivery status unavailable");
    expect(deliveryStatusLabel(null)).toBe("delivery status unavailable");
  });
});
