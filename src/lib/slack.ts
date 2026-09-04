import type { DailyPulseReport, PortfolioStats } from "./reporting";

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
  succeeded: "🟢",
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

function formatPortfolioSummary(portfolio: PortfolioStats | undefined): string | null {
  if (!portfolio) return null;

  const statuses = Object.entries(portfolio.runStatuses)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `${count} ${status}`)
    .join(" · ");
  const delivery = portfolio.slackDelivery;
  const deliveryParts = [
    delivery.sent ? `${delivery.sent} sent` : null,
    delivery.failed ? `${delivery.failed} failed` : null,
    delivery.queued ? `${delivery.queued} queued` : null,
    delivery.processing ? `${delivery.processing} processing` : null,
  ].filter(Boolean);
  const errorParts = [
    portfolio.runStatuses.failed ? `${portfolio.runStatuses.failed} failed run${portfolio.runStatuses.failed === 1 ? "" : "s"}` : null,
    portfolio.failedObservations ? `${portfolio.failedObservations} failed observation${portfolio.failedObservations === 1 ? "" : "s"}` : null,
    delivery.failed ? `${delivery.failed} failed ${delivery.failed === 1 ? "delivery" : "deliveries"}` : null,
  ].filter(Boolean);

  return [
    `*LOOP TO DATE*\n📈 *Runs to date:* ${portfolio.totalRuns} total · ${portfolio.daysRunning ?? "—"} days running${portfolio.startedAt ? ` · started ${portfolio.startedAt.slice(0, 10)}` : ""}`,
    `🧭 *Run status:* ${statuses || "no runs recorded"}`,
    `🧾 *Evidence:* ${portfolio.totalObservations} observations${portfolio.failedObservations ? ` · ${portfolio.failedObservations} failed` : ""}`,
    `🗂️ *Work queue:* ${portfolio.openFindings} open finding${portfolio.openFindings === 1 ? "" : "s"}`,
    `📣 *Slack delivery:* ${deliveryParts.length ? deliveryParts.join(" · ") : "no delivery records"}`,
    `⚠️ *Errors:* ${errorParts.length ? errorParts.join(" · ") : "none recorded"}`,
    `💸 *Provider cost:* $${portfolio.totalCostUsd.toFixed(3)} recorded`,
  ].join("\n");
}

function roleLabel(report: DailyPulseReport): string {
  return report.comparison?.role === "variant" ? "VARIANT B" : "CONTROL";
}

function measurementSummary(report: DailyPulseReport): string | null {
  const measurement = report.measurement;
  if (!measurement) return null;
  const expected = measurement.expectedPromptChecks ?? measurement.observedPromptChecks;
  const validity = measurement.targetIsCanonical ? "canonical target" : "⚠️ target mismatch";
  return `🎯 Target: ${measurement.targetHost ?? "unknown host"} · ${validity}\n🧪 Coverage: ${measurement.observedPromptChecks}/${expected} prompts`;
}

/** Format the paired daily comparison as one Slack parent message. The two reports remain separate in Supabase. */
export function formatCombinedDailyPulseMessage(reports: DailyPulseReport[]): { text: string; blocks: SlackBlock[] } {
  if (!reports.length) throw new Error("At least one report is required");
  const ordered = [...reports].sort((a, b) => (a.comparison?.role === "control" ? -1 : 1) - (b.comparison?.role === "control" ? -1 : 1));
  const primary = [...ordered].sort((a, b) => (b.portfolio?.totalRuns ?? 0) - (a.portfolio?.totalRuns ?? 0))[0];
  const dateKey = primary.window.end.slice(0, 10);
  const isPair = ordered.length > 1;
  const title = isPair ? "control + Variant B" : primary.health;
  const text = `AEO LOOP PULSE · ${dateKey} · ${title}`;
  const signalLines = ordered
    .map((report) => {
      const citation = report.kpis.find((kpi) => kpi.key === "synthetic_citation_rate");
      const integrity = report.kpis.find((kpi) => kpi.key === "target_page_integrity");
      const measurement = report.measurement;
      const coverage = measurement
        ? ` · ${measurement.observedPromptChecks}/${measurement.expectedPromptChecks ?? measurement.observedPromptChecks} prompts · ${measurement.targetHost ?? "unknown host"}`
        : "";
      return `*${roleLabel(report)}* · Citation rate ${citation?.displayValue ?? "—"} · Target page ${integrity?.displayValue ?? "—"}${coverage}`;
    })
    .join("\n");
  const actionLines = [...new Map(ordered.flatMap((report) => report.actions).map((action) => [action.title, action])).values()];
  const actions = actionLines.length
    ? actionLines.map((action) => `• [${action.priority}] ${action.title}`).join("\n")
    : "_No open findings were present when this report was generated._";
  const portfolio = formatPortfolioSummary(primary.portfolio);
  const actionElements = [
    { type: "button" as const, text: { type: "plain_text" as const, text: "Open dashboard" }, url: primary.links.dashboard },
    { type: "button" as const, text: { type: "plain_text" as const, text: "Open control report" }, url: (ordered.find((report) => report.comparison?.role === "control") ?? primary).links.report },
    ...(ordered.some((report) => report.comparison?.role === "variant")
      ? [{ type: "button" as const, text: { type: "plain_text" as const, text: "Open Variant B report" }, url: (ordered.find((report) => report.comparison?.role === "variant") as DailyPulseReport).links.report }]
      : []),
  ].filter((button) => /^https?:\/\//.test(button.url));

  const blocks: SlackBlock[] = [
    { type: "header", text: { type: "plain_text", text: `${healthLabel(primary.health)} AEO LOOP PULSE · ${dateKey}` } },
    { type: "section", text: { type: "mrkdwn", text: `*TODAY'S PAIRED CHECK*\n${signalLines}` } },
    ...(portfolio ? [{ type: "section", text: { type: "mrkdwn", text: portfolio } }] : []),
    { type: "section", text: { type: "mrkdwn", text: `*FUNNEL*\n${primary.funnel.stages.map((stage) => `${stage.label}: ${stage.value ?? "—"}`).join("  →  ")}` } },
    { type: "section", text: { type: "mrkdwn", text: `*BIGGEST LEAK*\n${primary.funnel.biggestLeak.from} → ${primary.funnel.biggestLeak.to} is not measurable yet.` } },
    { type: "section", text: { type: "mrkdwn", text: `*NEXT DECISIONS*\n${actions}` } },
    ...(actionElements.length ? [{ type: "actions", elements: actionElements }] : []),
  ];

  return { text, blocks };
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
    : "_No open findings were present when this report was generated._";

  // Slack rejects the whole message with invalid_blocks if a button's url
  // isn't absolute — a relative link (seen in production when the report's
  // site origin was misconfigured at generation time) would otherwise kill
  // delivery entirely. Drop only the broken button(s) instead of the message.
  const actionElements = [
    { type: "button" as const, text: { type: "plain_text" as const, text: "Open dashboard" }, url: report.links.dashboard },
    { type: "button" as const, text: { type: "plain_text" as const, text: "Open run" }, url: report.links.run },
    { type: "button" as const, text: { type: "plain_text" as const, text: "Open report" }, url: report.links.report },
  ].filter((button) => /^https?:\/\//.test(button.url));

  const blocks: SlackBlock[] = [
    { type: "header", text: { type: "plain_text", text: `${healthLabel(report.health)} AEO LOOP PULSE · ${dateKey}` } },
    { type: "section", text: { type: "mrkdwn", text: `*CORE SIGNALS*\n${kpiLines}` } },
    ...(measurementSummary(report) ? [{ type: "section", text: { type: "mrkdwn", text: `*MEASUREMENT CONTRACT*\n${measurementSummary(report)}` } }] : []),
    ...(formatPortfolioSummary(report.portfolio) ? [{ type: "section", text: { type: "mrkdwn", text: formatPortfolioSummary(report.portfolio)! } }] : []),
    { type: "section", text: { type: "mrkdwn", text: `*FUNNEL*\n${funnelLine}` } },
    { type: "section", text: { type: "mrkdwn", text: leakText } },
    { type: "section", text: { type: "mrkdwn", text: `*NEXT DECISIONS*\n${actionLines}` } },
    ...(actionElements.length ? [{ type: "actions", elements: actionElements }] : []),
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
