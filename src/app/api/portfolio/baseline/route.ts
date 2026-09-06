import { apiErrorResponse, logServerError } from "@/lib/api-response";
import { portfolioCheckRows, portfolioPageRows, runPortfolioBaseline } from "@/lib/portfolio-baseline";
import { createServiceClient } from "@/lib/supabase";
import { defaultPortfolioSitemapUrl } from "@/lib/portfolio-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return apiErrorResponse("UNAUTHORIZED", "Portfolio baseline authorization required", 401);
  }

  try {
    const sitemapUrl = process.env.AEO_PORTFOLIO_SITEMAP_URL || defaultPortfolioSitemapUrl;
    const result = await runPortfolioBaseline(sitemapUrl);
    const client = createServiceClient();
    const { error: pagesError } = await client.from("portfolio_pages").upsert(portfolioPageRows(result), { onConflict: "page_key" });
    if (pagesError) throw new Error(`Could not persist portfolio page registry: ${pagesError.message}`);
    const { error: checksError } = await client.from("portfolio_page_checks").insert(portfolioCheckRows(result));
    if (checksError) throw new Error(`Could not persist portfolio readiness checks: ${checksError.message}`);

    return Response.json({
      ok: true,
      checkedAt: result.checkedAt,
      sitemapUrl: result.sitemapUrl,
      registryDigest: result.registryDigest,
      pages: result.pages.length,
      ready: result.checks.filter((check) => check.status === "ready").length,
      needsAttention: result.checks.filter((check) => check.status === "needs_attention").length,
      failed: result.checks.filter((check) => check.status === "failed").length,
    });
  } catch (error) {
    logServerError("Portfolio baseline failed", error);
    return apiErrorResponse("PORTFOLIO_BASELINE_FAILED", "Portfolio baseline failed", 500);
  }
}
