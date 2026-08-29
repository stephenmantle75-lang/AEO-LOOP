export type AnalysisPreviewRequestResult =
  | { ok: true; runId: string }
  | { ok: false; code: "INVALID_RUN"; message: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Validate the only input accepted by the protected, read-only preview route. */
export function parseAnalysisPreviewRequest(input: unknown): AnalysisPreviewRequestResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, code: "INVALID_RUN", message: "runId must be a valid stored run ID" };
  }

  const runId = (input as { runId?: unknown }).runId;
  if (typeof runId !== "string" || !uuidPattern.test(runId.trim())) {
    return { ok: false, code: "INVALID_RUN", message: "runId must be a valid stored run ID" };
  }

  return { ok: true, runId: runId.trim() };
}
