"use client";

import { FormEvent, useState } from "react";
import { createBrowserAuthClient } from "@/lib/supabase-auth-browser";

export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    const supabase = createBrowserAuthClient();
    if (!supabase) {
      setError("Auth is not configured for this environment.");
      setBusy(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (signInError) setError("The sign-in email could not be sent. Check the configured Auth provider and address.");
    else setMessage("Check your email for the secure sign-in link.");
    setBusy(false);
  }

  return <form className="auth-form" onSubmit={submit}>
    <label htmlFor="review-email">Approved reviewer email</label>
    <input id="review-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
    <button className="primary-button" type="submit" disabled={busy}>{busy ? "Sending…" : "Send magic link"}</button>
    {message && <p className="success-copy" role="status">{message}</p>}
    {error && <p className="error-copy" role="alert">{error}</p>}
  </form>;
}
