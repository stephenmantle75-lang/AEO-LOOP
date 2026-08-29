import { apiErrorResponse, logServerError } from "@/lib/api-response";
import { reviewPersistedAnalysis } from "@/lib/analysis-persistence";
import { isSameOrigin, getReviewAccess } from "@/lib/review-access";
import { createServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseReviewRequest(value: unknown): { runId: string; decision: "approved" | "rejected"; reviewNote: string } | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (typeof body.runId !== "string" || !uuidPattern.test(body.runId)) return null;
  if (body.decision !== "approved" && body.decision !== "rejected") return null;
  if (typeof body.reviewNote !== "string") return null;
  const reviewNote = body.reviewNote.trim();
  if (!reviewNote || reviewNote.length > 2000) return null;
  return { runId: body.runId, decision: body.decision, reviewNote };
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return apiErrorResponse("CSRF_REJECTED", "Review requests must originate from this application", 403);
  }

  const access = await getReviewAccess();
  if (!access.ok) return apiErrorResponse(access.code, access.message, access.status);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return apiErrorResponse("INVALID_REVIEW", "Request body must be valid JSON", 422);
  }

  const parsed = parseReviewRequest(input);
  if (!parsed) return apiErrorResponse("INVALID_REVIEW", "A valid run ID, decision, and review note are required", 422);

  try {
    const result = await reviewPersistedAnalysis({
      client: createServiceClient(),
      runId: parsed.runId,
      reviewerId: access.userId,
      decision: parsed.decision,
      reviewNote: parsed.reviewNote,
    });
    return Response.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("Analysis review failed", error);
    return apiErrorResponse("ANALYSIS_REVIEW_FAILED", "Analysis review could not be completed", 409);
  }
}
