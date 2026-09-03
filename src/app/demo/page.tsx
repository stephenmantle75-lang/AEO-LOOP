import { ObservatoryShell, PageHeader } from "../_components/observatory-shell";
import { DemoClient } from "./demo-client";
import { getOverviewData, getReportDeliveryStatus } from "@/lib/observatory";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const overview = await getOverviewData();
  const latestRun = overview.data.runs[0] ?? null;
  const delivery = latestRun ? await getReportDeliveryStatus(latestRun.id) : null;
  const finding = latestRun ? overview.data.findings.find((item) => item.run_id === latestRun.id) ?? null : null;

  return <ObservatoryShell active="demo" findingCount={overview.data.findings.filter((item) => item.status === "new").length}>
    <PageHeader
      eyebrow="AEO LOOP / Event demo"
      title="Make the invisible loop visible."
      description="A real production run, replayed from Supabase, with every handoff visible from public page to human decision."
      statusTone={overview.connected ? "connected" : "disconnected"}
      statusText={overview.connected ? "● Live production data" : "○ Data unavailable"}
    />
    <DemoClient run={latestRun} observations={overview.data.latestObservations} finding={finding} delivery={delivery} connected={overview.connected} />
  </ObservatoryShell>;
}
