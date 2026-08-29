import { getServerEnv } from "./env";
import { scrapeTargetPage, searchWithExa, type PageObservation } from "./collectors";
import { completeRun, insertObservation, claimDailyRun, claimExperimentRun, type ClaimResult } from "./runs";
import { experimentRunKey, promptLimit, seoVsAeoTopic, topicForKey, type TopicDefinition } from "./topic";
import { createServiceClient } from "./supabase";
import { persistClosedRunReport } from "./reporting-persistence";

function dateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function observationRow(runId: string, topic: TopicDefinition, provider: string, observationType: string, question: string, result: PageObservation) {
  const targetUrl = topic.targetUrl;
  const mentioned = result.metrics.citationFound === true || result.citationUrls.includes(targetUrl);
  return {
    run_id: runId,
    topic_key: topic.key,
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

export type CollectionResult = {
  runId: string;
  runType: "daily_observation" | "experiment_retest";
  topicKey: string;
  status: string;
  observations: number;
  reportStatus?: "disabled" | "queued" | "failed";
  reason?: string;
};

type CollectionConfig = {
  topic: TopicDefinition;
  runKey: string;
  runType: CollectionResult["runType"];
  claim: (client: ReturnType<typeof createServiceClient>, runKey: string, sources: string[], metadata: Record<string, unknown>) => Promise<ClaimResult>;
};

async function runTopicObservation(config: CollectionConfig): Promise<CollectionResult> {
  const env = getServerEnv();
  if (!env.cronSecret) throw new Error("CRON_SECRET is not configured");
  const client = createServiceClient();
  const startedAt = Date.now();
  const sources = ["firecrawl", "exa"];
  const prompts = promptLimit(config.topic);
  const claim = await config.claim(client, config.runKey, sources, { topicKey: config.topic.key, promptLimit: prompts.length, targetUrl: config.topic.targetUrl });
  if (!claim.claimed || !claim.run) return { runId: claim.run?.id ?? "", runType: config.runType, topicKey: config.topic.key, status: "not_started", observations: 0, reason: claim.reason };

  const runId = claim.run.id;
  let observations = 0;
  let failures = 0;
  let costUsd = 0;
  try {
    const pageResult = await scrapeTargetPage(config.topic.targetUrl);
    await insertObservation(client, observationRow(runId, config.topic, "firecrawl", "page_fetch", config.topic.question, pageResult));
    observations += 1;
    failures += pageResult.status === "failed" ? 1 : 0;
    costUsd += estimatedCost(pageResult);

    for (const prompt of prompts) {
      const result = await searchWithExa(prompt, config.topic.targetUrl);
      await insertObservation(client, observationRow(runId, config.topic, "exa", "citation_check", prompt, result));
      observations += 1;
      failures += result.status === "failed" ? 1 : 0;
      costUsd += estimatedCost(result);
    }

    const status = failures === observations ? "failed" : failures > 0 ? "partial" : "succeeded";
    await completeRun(client, runId, status, startedAt, sources, costUsd);
    if (!env.reportPersistenceEnabled) return { runId, runType: config.runType, topicKey: config.topic.key, status, observations, reportStatus: "disabled" };

    try {
      await persistClosedRunReport(client, runId, process.env.NEXT_PUBLIC_DASHBOARD_ORIGIN ?? "");
      return { runId, runType: config.runType, topicKey: config.topic.key, status, observations, reportStatus: "queued" };
    } catch (reportError) {
      console.error("Daily report persistence failed after run close", reportError);
      return { runId, runType: config.runType, topicKey: config.topic.key, status, observations, reportStatus: "failed" };
    }
  } catch (error) {
    await completeRun(client, runId, "failed", startedAt, sources, costUsd, error instanceof Error ? error.message : "Unknown collection error");
    throw error;
  }
}

export async function runDailyObservation(): Promise<CollectionResult> {
  return runTopicObservation({
    topic: seoVsAeoTopic,
    runKey: `daily-observation:${dateKey()}`,
    runType: "daily_observation",
    claim: claimDailyRun,
  });
}

export async function runExperimentObservation(topicKey: string): Promise<CollectionResult> {
  const topic = topicForKey(topicKey);
  if (!topic) throw new Error("topicKey must identify an approved experiment topic");
  const startedAt = new Date().toISOString();
  return runTopicObservation({
    topic,
    runKey: experimentRunKey(topic.key, startedAt, crypto.randomUUID()),
    runType: "experiment_retest",
    claim: claimExperimentRun,
  });
}
