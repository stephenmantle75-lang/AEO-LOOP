import { ObservatoryShell, PageHeader } from "../_components/observatory-shell";
import { DemoClient } from "./demo-client";

export default function DemoPage() {
  return <ObservatoryShell active="demo">
    <PageHeader
      eyebrow="AEO LOOP / Event demo"
      title="Make the invisible loop visible."
      description="A five-minute walkthrough of how a question becomes evidence, a finding, and a human-approved next move."
      statusTone="neutral"
      statusText="● Demo mode"
    />
    <DemoClient />
  </ObservatoryShell>;
}
