import { runExperimentObservation } from "@/lib/collection";
import { parseExperimentRequest } from "@/lib/experiment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return Response.json({ error: { code: "UNAUTHORIZED", message: "Experiment authorization required" } }, { status: 401 });
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) return unauthorized();

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: { code: "INVALID_TOPIC", message: "Request body must be valid JSON" } }, { status: 422 });
  }

  const parsed = parseExperimentRequest(input);
  if (!parsed.ok) return Response.json({ error: { code: parsed.code, message: parsed.message } }, { status: 422 });

  try {
    const result = await runExperimentObservation(parsed.topicKey);
    const status = result.status === "not_started" ? 202 : 200;
    return Response.json({ ok: true, ...result }, { status });
  } catch (error) {
    return Response.json({ error: { code: "COLLECTION_FAILED", message: error instanceof Error ? error.message : "Experiment collection failed" } }, { status: 500 });
  }
}
