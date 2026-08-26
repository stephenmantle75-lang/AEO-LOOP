import { runDailyObservation } from "@/lib/collection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return Response.json({ error: { code: "UNAUTHORIZED", message: "Cron authorization required" } }, { status: 401 });
  }

  try {
    const result = await runDailyObservation();
    const status = result.status === "not_started" ? 202 : 200;
    return Response.json({ ok: true, ...result }, { status });
  } catch (error) {
    return Response.json({ error: { code: "COLLECTION_FAILED", message: error instanceof Error ? error.message : "Collection failed" } }, { status: 500 });
  }
}
