import type { DailyPulseReport } from "./reporting";

export type SlackBlock = Record<string, unknown>;

export type SlackSendResult = { ok: true; ts: string } | { ok: false; error: string };

export type SlackAuthCheck = { ok: true; team: string; user: string } | { ok: false; error: string };

/**
 * Read-only credential check via auth.test — sends no message, just confirms
 * whether a token is currently valid and which bot/workspace it belongs to.
 * Lets the cron response answer "is this token actually good right now"
 * without ever needing the token value outside this one request.
 */
export async function checkSlackAuth(token: string): Promise<SlackAuthCheck> {
  try {
    const response = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await response.json()) as { ok: boolean; team?: string; user?: string; error?: string };
    if (!data.ok) return { ok: false, error: data.error ?? `http_${response.status}` };
    return { ok: true, team: data.team ?? "unknown", user: data.user ?? "unknown" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "network_error" };
  }
}

/**
 * Post one message to Slack via chat.postMessage using a plain fetch call.
 * ponytail: no @slack/web-api dependency — this is the entire surface we need,
 * matching the curl-based posting already used by the other repos' CI alerts.
 */
export async function postSlackMessage(options: {
  token: string;
  channel: string;
  text: string;
  blocks?: SlackBlock[];
  threadTs?: string;
}): Promise<SlackSendResult> {
  const { token, channel, text, blocks, threadTs } = options;
  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ channel, text, blocks, thread_ts: threadTs }),
    });
    const data = (await response.json()) as { ok: boolean; ts?: string; error?: string };
    if (!data.ok) return { ok: false, error: data.error ?? `http_${response.status}` };
    return { ok: true, ts: data.ts! };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "network_error" };
  }
}

const HEALTH_EMOJI: Record<string, string> = {
  completed: "🟢",
  partial: "🟡",
  failed: "🔴",
};

function healthLabel(health: string): string {
  return `${HEALTH_EMOJI[health] ?? "⚪"} ${health}`;
}

function formatDelta(kpi: DailyPulseReport["kpis"][number]): string {
  if (kpi.delta === null) return "— no comparison yet";
  const pp = Math.round(kpi.delta * 100);
  return `${pp >= 0 ? "↑" : "↓"} ${Math.abs(pp)} pp vs ${kpi.freshness ? "prior window" : "baseline"}`;
}

/** Build the rich daily-pulse message: one parent Slack message, links back to Supabase-backed evidence. */
export function formatDailyPulseMessage(report: DailyPulseReport): { text: string; blocks: SlackBlock[] } {
  const dateKey = report.window.end.slice(0, 10);
  const text = `AEO LOOP PULSE · ${dateKey} · ${report.health}`;

  const kpiLines = report.kpis
    .map((kpi) => `*${kpi.label}*  ${kpi.displayValue}  ${kpi.status === "observed" ? formatDelta(kpi) : "_not measurable_"}`)
    .join("\n");

  const funnelLine = report.funnel.stages
    .map((stage) => `${stage.label}: ${stage.value ?? "—"}`)
    .join("  →  ");

  const leak = report.funnel.biggestLeak;
  const leakText =
    leak.status === "not_measurable"
      ? `*Biggest leak*\n${leak.from} → ${leak.to} is not measurable yet.`
      : `*Biggest leak*\n${leak.from} → ${leak.to}`;

  const actionLines = report.actions.length
    ? report.actions.map((action) => `• [${action.priority}] ${action.title}`).join("\n")
    : "_No open findings._";

  const blocks: SlackBlock[] = [
    { type: "header", text: { type: "plain_text", text: `${healthLabel(report.health)} AEO LOOP PULSE · ${dateKey}` } },
    { type: "section", text: { type: "mrkdwn", text: `*CORE SIGNALS*\n${kpiLines}` } },
    { type: "section", text: { type: "mrkdwn", text: `*FUNNEL*\n${funnelLine}` } },
    { type: "section", text: { type: "mrkdwn", text: leakText } },
    { type: "section", text: { type: "mrkdwn", text: `*NEXT DECISIONS*\n${actionLines}` } },
    {
      type: "actions",
      elements: [
        { type: "button", text: { type: "plain_text", text: "Open dashboard" }, url: report.links.dashboard },
        { type: "button", text: { type: "plain_text", text: "Open run" }, url: report.links.run },
        { type: "button", text: { type: "plain_text", text: "Open report" }, url: report.links.report },
      ],
    },
  ];

  return { text, blocks };
}

/** Short one-line alert for an approved finding — mirrors the CI-alert-with-Linear-link pattern. */
export function formatFindingAlertText(intent: {
  title: string;
  priority: string;
  dashboardPath: string;
  siteOrigin: string;
}): string {
  const link = `${intent.siteOrigin.replace(/\/$/, "")}${intent.dashboardPath}`;
  return `🔍 finding [${intent.priority}] — ${intent.title}. <${link}|View finding>`;
}
