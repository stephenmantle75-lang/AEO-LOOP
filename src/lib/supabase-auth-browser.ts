import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAuthConfig } from "./env";

export function createBrowserAuthClient() {
  const config = getSupabaseAuthConfig();
  return config ? createBrowserClient(config.supabaseUrl, config.publishableKey) : null;
}
