import { getServerEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase";
import { deliverQueuedFindingAlerts, deliverQueuedReports } from "@/lib/slack-delivery";
import { apiErrorResponse, logServerError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ANT-58: drains report_outbox (daily pulse) and the slack rows of
// finding_delivery_events (immediate alerts) into #aeo-growth-loop.
// Off by default — set AEO_SLACK_DELIVERY_ENABLED=true and SLACK_BOT_TOKEN
// once the bot has been invited to the channel.
export async function GET(request: Request) {
  const env = getServerEnv();
  const authorization = request.headers.get("authorization");
  if (!env.cronSecret || authorization !== `Bearer ${env.cronSecret}`) {
    return apiErrorResponse("UNAUTHORIZED", "Cron authorization required", 401);
  }
  if (!env.slackDeliveryEnabled || !env.slackBotToken) {
    return Response.json({ ok: true, skipped: "slack_delivery_disabled" }, { status: 202 });
  }

  try {
    const client = createServiceClient();
    const config = { token: env.slackBotToken, channel: env.slackChannel!, siteOrigin: env.siteOrigin };
    const [reports, findingAlerts] = await Promise.all([
      deliverQueuedReports(client, config),
      deliverQueuedFindingAlerts(client, config),
    ]);
    return Response.json({ ok: true, reports, findingAlerts });
  } catch (error) {
    logServerError("Slack delivery failed", error);
    return apiErrorResponse("DELIVERY_FAILED", "Slack delivery failed", 500);
  }
}
