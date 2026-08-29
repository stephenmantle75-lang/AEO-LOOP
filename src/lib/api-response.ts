export function apiErrorResponse(code: string, message: string, status: number): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/** Log only a safe error classification; provider/database details stay private. */
export function logServerError(context: string, error: unknown): void {
  console.error(context, {
    name: error instanceof Error ? error.name : "UnknownError",
    type: typeof error,
  });
}
