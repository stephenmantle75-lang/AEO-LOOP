import { parseAnalysisPreviewRequest } from "@/lib/analysis-preview";
import { AnalysisRunNotFoundError, previewStoredRunAnalysis } from "@/lib/analysis-persistence";
import { createServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Return a draft analysis for a stored run; this route has no persistence or delivery side effect. */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return errorResponse("UNAUTHORIZED", "Analysis preview authorization required", 401);
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse("INVALID_RUN", "Request body must be valid JSON", 422);
  }

  const parsed = parseAnalysisPreviewRequest(input);
  if (!parsed.ok) return errorResponse(parsed.code, parsed.message, 422);

  try {
    const analysis = await previewStoredRunAnalysis(createServiceClient(), parsed.runId);
    return Response.json({ ok: true, mode: "draft_only", analysis }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AnalysisRunNotFoundError) {
      return errorResponse("RUN_NOT_FOUND", "Stored analysis run was not found", 404);
    }
    console.error("Analysis preview failed", error);
    return errorResponse("ANALYSIS_PREVIEW_FAILED", "Analysis preview could not be generated", 500);
  }
}
