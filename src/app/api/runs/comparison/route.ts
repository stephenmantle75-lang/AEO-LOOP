import { runPairedExperimentObservation } from "@/lib/collection";
import { apiErrorResponse, logServerError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return apiErrorResponse("UNAUTHORIZED", "Experiment authorization required", 401);
  }

  try {
    const result = await runPairedExperimentObservation();
    const status = result.control.status === "not_started" && result.variant.status === "not_started" ? 202 : 200;
    return Response.json({ ok: true, runType: "paired_experiment", ...result }, { status });
  } catch (error) {
    logServerError("Paired experiment collection failed", error);
    return apiErrorResponse("COLLECTION_FAILED", "Paired experiment collection failed", 500);
  }
}
