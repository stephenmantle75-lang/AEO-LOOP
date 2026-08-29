import { reportingTimeZone } from "./reporting-clock";

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
};

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
  };
}

export function isConfigured(): boolean {
  return required.every((key) => Boolean(process.env[key]));
}
