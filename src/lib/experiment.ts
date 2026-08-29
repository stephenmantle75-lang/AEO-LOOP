import { topicForKey } from "./topic";

export type ExperimentRequest = { topicKey: string };

export type ExperimentRequestResult =
  | { ok: true; topicKey: string }
  | { ok: false; code: "INVALID_TOPIC"; message: string };

export function parseExperimentRequest(input: unknown): ExperimentRequestResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, code: "INVALID_TOPIC", message: "topicKey must identify an approved experiment topic" };
  }

  const topicKey = (input as { topicKey?: unknown }).topicKey;
  if (typeof topicKey !== "string") {
    return { ok: false, code: "INVALID_TOPIC", message: "topicKey must identify an approved experiment topic" };
  }

  const topic = topicForKey(topicKey.trim());
  if (!topic) {
    return { ok: false, code: "INVALID_TOPIC", message: "topicKey must identify an approved experiment topic" };
  }

  return { ok: true, topicKey: topic.key };
}
