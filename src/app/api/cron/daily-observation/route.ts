import { runDailyComparison } from "@/lib/collection";
import { apiErrorResponse, logServerError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return apiErrorResponse("UNAUTHORIZED", "Cron authorization required", 401);
  }

  try {
    const result = await runDailyComparison();
    const status = result.control.status === "not_started" && result.variant.status === "not_started" ? 202 : 200;
    return Response.json({ ok: true, runType: "daily_comparison", ...result }, { status });
  } catch (error) {
    logServerError("Daily observation failed", error);
    return apiErrorResponse("COLLECTION_FAILED", "Collection failed", 500);
  }
}
