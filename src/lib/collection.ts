import { getServerEnv } from "./env";
import { scrapeTargetPage, searchWithExa, type PageObservation } from "./collectors";
import { completeRun, insertObservation, claimDailyRun } from "./runs";
import { promptLimit, seoVsAeoTopic } from "./topic";
import { createServiceClient } from "./supabase";

function dateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function observationRow(runId: string, provider: string, observationType: string, question: string, targetUrl: string, result: PageObservation) {
  const mentioned = result.metrics.citationFound === true || result.citationUrls.includes(targetUrl);
  return {
    run_id: runId,
    topic_key: seoVsAeoTopic.key,
    question,
    provider,
    observation_type: observationType,
    status: result.status,
    target_url: targetUrl,
    answer_text: result.answerText ?? null,
    mentioned,
    citation_found: mentioned,
    citation_urls: result.citationUrls,
    citations: result.citations,
    metrics: result.metrics,
    source_url: result.sourceUrl ?? null,
    confidence: result.confidence ?? null,
    error_message: result.errorMessage ?? null,
  };
}

function estimatedCost(result: PageObservation): number {
  const cost = result.metrics.costDollars;
  if (!cost || typeof cost !== "object" || Array.isArray(cost)) return 0;
  const total = (cost as { total?: unknown }).total;
  return typeof total === "number" && Number.isFinite(total) && total >= 0 ? total : 0;
}

export async function runDailyObservation(): Promise<{ runId: string; status: string; observations: number; reason?: string }> {
  const env = getServerEnv();
  if (!env.cronSecret) throw new Error("CRON_SECRET is not configured");
  const client = createServiceClient();
  const startedAt = Date.now();
  const sources = ["firecrawl", "exa"];
  const claim = await claimDailyRun(client, `daily-observation:${dateKey()}`, sources, { topicKey: seoVsAeoTopic.key, promptLimit: promptLimit(seoVsAeoTopic).length, targetUrl: seoVsAeoTopic.targetUrl });
  if (!claim.claimed || !claim.run) return { runId: claim.run?.id ?? "", status: "not_started", observations: 0, reason: claim.reason };

  const runId = claim.run.id;
  let observations = 0;
  let failures = 0;
  let costUsd = 0;
  try {
    const pageResult = await scrapeTargetPage(seoVsAeoTopic.targetUrl);
    await insertObservation(client, observationRow(runId, "firecrawl", "page_fetch", seoVsAeoTopic.question, seoVsAeoTopic.targetUrl, pageResult));
    observations += 1;
    failures += pageResult.status === "failed" ? 1 : 0;
    costUsd += estimatedCost(pageResult);

    for (const prompt of promptLimit(seoVsAeoTopic)) {
      const result = await searchWithExa(prompt, seoVsAeoTopic.targetUrl);
      await insertObservation(client, observationRow(runId, "exa", "citation_check", prompt, seoVsAeoTopic.targetUrl, result));
      observations += 1;
      failures += result.status === "failed" ? 1 : 0;
      costUsd += estimatedCost(result);
    }

    const status = failures === observations ? "failed" : failures > 0 ? "partial" : "succeeded";
    await completeRun(client, runId, status, startedAt, sources, costUsd);
    return { runId, status, observations };
  } catch (error) {
    await completeRun(client, runId, "failed", startedAt, sources, costUsd, error instanceof Error ? error.message : "Unknown collection error");
    throw error;
  }
}
