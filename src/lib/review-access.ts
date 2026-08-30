import { reviewAuthEnabled } from "./env";
import { createServerAuthClient } from "./supabase-auth-server";

export type ReviewAccess =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 | 503; code: "REVIEW_AUTH_REQUIRED" | "REVIEW_FORBIDDEN" | "REVIEW_AUTH_MISCONFIGURED"; message: string };

/**
 * Server-side authorization boundary for human analysis review.
 * The reviewer UUID is a server-side allowlist, never user-editable metadata.
 */
export async function getReviewAccess(): Promise<ReviewAccess> {
  if (!reviewAuthEnabled()) {
    return {
      ok: false,
      status: 503,
      code: "REVIEW_AUTH_MISCONFIGURED",
      message: "Human review is not enabled for this environment.",
    };
  }

  const reviewerId = process.env.AEO_REVIEWER_USER_ID;
  const supabase = await createServerAuthClient();
  if (!reviewerId || !supabase) {
    return {
      ok: false,
      status: 503,
      code: "REVIEW_AUTH_MISCONFIGURED",
      message: "Human review authentication is not configured.",
    };
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return {
      ok: false,
      status: 401,
      code: "REVIEW_AUTH_REQUIRED",
      message: "Sign in is required to review analysis.",
    };
  }

  if (data.user.id !== reviewerId) {
    return {
      ok: false,
      status: 403,
      code: "REVIEW_FORBIDDEN",
      message: "This account is not allowed to review analysis.",
    };
  }

  return { ok: true, userId: data.user.id };
}

export function safeNextPath(value: string | null, fallback = "/findings"): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback;
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}
