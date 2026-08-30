import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAuthConfig, reviewAuthEnabled } from "@/lib/env";

/** Refresh Supabase Auth cookies for the protected review surface. */
export async function proxy(request: NextRequest) {
  if (!reviewAuthEnabled()) return NextResponse.next();
  const config = getSupabaseAuthConfig();
  if (!config) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.supabaseUrl, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = { matcher: ["/review/:path*", "/auth/:path*"] };
