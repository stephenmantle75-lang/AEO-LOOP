import { safeNextPath } from "@/lib/review-access";
import { getSupabaseAuthConfig } from "@/lib/env";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNextPath(params.next ?? null, "/findings");
  const configured = Boolean(getSupabaseAuthConfig() && process.env.AEO_REVIEW_AUTH_ENABLED === "true");

  return <main className="auth-page">
    <section className="auth-card" aria-labelledby="login-title">
      <div className="eyebrow">AEO Loop / Review access</div>
      <h1 id="login-title">Sign in to review analysis</h1>
      <p className="subhead">Human approval is the gate before an evidence-backed draft can become a finding or trigger delivery.</p>
      {configured ? <LoginForm next={next} /> : <div className="notice error-notice">Review authentication is not configured in this environment. Set the Auth provider, publishable key, owner user ID, and review flag before enabling this surface.</div>}
    </section>
  </main>;
}
