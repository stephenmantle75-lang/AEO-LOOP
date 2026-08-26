import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv, isConfigured } from "./env";

export function createServiceClient(): SupabaseClient {
  const env = getServerEnv();
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function dashboardClient(): SupabaseClient | null {
  return isConfigured() ? createServiceClient() : null;
}
