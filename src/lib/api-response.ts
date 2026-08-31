export function apiErrorResponse(code: string, message: string, status: number): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

const SAFE_STORED_ERRORS = [
  /^Firecrawl request failed with HTTP [45]\d{2}$/,
  /^Exa request failed with HTTP [45]\d{2}$/,
  /^Firecrawl request failed after retries$/,
  /^Exa request failed after retries$/,
  /^Target page did not return an inspectable document$/,
  /^Monthly provider budget exhausted before collection started$/,
  /^FIRECRAWL_API_KEY is not configured$/,
  /^EXA_API_KEY is not configured$/,
];

/** Keep arbitrary stored provider/database errors out of rendered pages. */
export function publicErrorMessage(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const message = value.trim().replace(/\s+/g, " ");
  if (message.length > 160 || !SAFE_STORED_ERRORS.some((pattern) => pattern.test(message))) return fallback;
  return message;
}

/** Log only a safe error classification; provider/database details stay private. */
export function logServerError(context: string, error: unknown): void {
  console.error(context, {
    name: error instanceof Error ? error.name : "UnknownError",
    type: typeof error,
  });
}
