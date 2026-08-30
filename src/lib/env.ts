import { reportingTimeZone } from "./reporting-clock";
import { parseMonthlyProviderBudgetUsd } from "./budget";

const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;

export type ServerEnv = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  firecrawlApiKey?: string;
  exaApiKey?: string;
  cronSecret?: string;
  reportPersistenceEnabled: boolean;
  analysisPersistenceEnabled: boolean;
  reportingTimeZone: string;
  monthlyProviderBudgetUsd?: number;
};

export function getSupabaseAuthConfig(): { supabaseUrl: string; publishableKey: string } | null {
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !publishableKey) return null;
  return { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey };
}

export function reviewAuthEnabled(): boolean {
  return process.env.AEO_REVIEW_AUTH_ENABLED === "true";
}

export function getServerEnv(): ServerEnv {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing server environment variables: ${missing.join(", ")}`);
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY,
    exaApiKey: process.env.EXA_API_KEY,
    cronSecret: process.env.CRON_SECRET,
    reportPersistenceEnabled: process.env.AEO_REPORT_PERSISTENCE_ENABLED === "true",
    analysisPersistenceEnabled: process.env.AEO_ANALYSIS_PERSISTENCE_ENABLED === "true",
    reportingTimeZone: reportingTimeZone(),
    monthlyProviderBudgetUsd: parseMonthlyProviderBudgetUsd(),
  };
}

export function isConfigured(): boolean {
  return required.every((key) => Boolean(process.env[key]));
}
