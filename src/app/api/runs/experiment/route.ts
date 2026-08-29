import { runExperimentObservation } from "@/lib/collection";
import { parseExperimentRequest } from "@/lib/experiment";
import { apiErrorResponse, logServerError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return apiErrorResponse("UNAUTHORIZED", "Experiment authorization required", 401);
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) return unauthorized();

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return apiErrorResponse("INVALID_TOPIC", "Request body must be valid JSON", 422);
  }

  const parsed = parseExperimentRequest(input);
  if (!parsed.ok) return apiErrorResponse(parsed.code, parsed.message, 422);

  try {
    const result = await runExperimentObservation(parsed.topicKey);
    const status = result.status === "not_started" ? 202 : 200;
    return Response.json({ ok: true, ...result }, { status });
  } catch (error) {
    logServerError("Experiment collection failed", error);
    return apiErrorResponse("COLLECTION_FAILED", "Experiment collection failed", 500);
  }
}
