import { getServerEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase";
import { deliverQueuedFindingAlerts, deliverQueuedReports } from "@/lib/slack-delivery";
import { apiErrorResponse, logServerError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ANT-58: drains report_outbox (daily pulse) and the slack rows of
// finding_delivery_events (immediate alerts) into #aeo-growth-loop.
// Two separate bot identities on purpose — Mantle Reporter posts the rich
// pulse, Hermes posts the short alerts, matching the personas already used
// elsewhere. Each drain runs independently: whichever token is configured
// goes live, the other stays a no-op until its token is set too.
// Master switch: AEO_SLACK_DELIVERY_ENABLED=true.
export async function GET(request: Request) {
  const env = getServerEnv();
  const authorization = request.headers.get("authorization");
  if (!env.cronSecret || authorization !== `Bearer ${env.cronSecret}`) {
    return apiErrorResponse("UNAUTHORIZED", "Cron authorization required", 401);
  }
  if (!env.slackDeliveryEnabled) {
    return Response.json({ ok: true, skipped: "slack_delivery_disabled" }, { status: 202 });
  }

  try {
    const client = createServiceClient();
    const channel = env.slackChannel!;
    const [reports, findingAlerts] = await Promise.all([
      env.slackReportBotToken
        ? deliverQueuedReports(client, { token: env.slackReportBotToken, channel, siteOrigin: env.siteOrigin })
        : { sent: 0, failed: 0, skipped: 0, reason: "no_report_bot_token" },
      env.slackAlertBotToken
        ? deliverQueuedFindingAlerts(client, { token: env.slackAlertBotToken, channel, siteOrigin: env.siteOrigin })
        : { sent: 0, failed: 0, skipped: 0, reason: "no_alert_bot_token" },
    ]);
    return Response.json({ ok: true, reports, findingAlerts });
  } catch (error) {
    logServerError("Slack delivery failed", error);
    return apiErrorResponse("DELIVERY_FAILED", "Slack delivery failed", 500);
  }
}
