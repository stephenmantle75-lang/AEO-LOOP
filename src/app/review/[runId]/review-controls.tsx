"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewControls({ runId }: { runId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approved" | "rejected") {
    setError(null);
    if (!note.trim()) {
      setError("Add a review note before approving or rejecting this analysis.");
      return;
    }
    setBusy(decision);
    const response = await fetch("/api/analysis/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ runId, decision, reviewNote: note.trim() }),
    });
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    if (!response.ok) setError(payload?.error?.message ?? "The review could not be completed.");
    else router.push("/findings");
    setBusy(null);
  }

  return <section className="panel page-panel review-controls" aria-labelledby="review-decision-title">
    <div className="panel-head"><span className="panel-title" id="review-decision-title">Human decision</span><span className="panel-meta">required before delivery</span></div>
    <label htmlFor="review-note">Review note</label>
    <textarea id="review-note" maxLength={2000} required value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain why the evidence supports or does not support this finding." />
    <div className="review-actions"><button className="primary-button" type="button" disabled={Boolean(busy)} onClick={() => decide("approved")}>{busy === "approved" ? "Approving…" : "Approve and create finding"}</button><button className="secondary-button" type="button" disabled={Boolean(busy)} onClick={() => decide("rejected")}>{busy === "rejected" ? "Rejecting…" : "Reject draft"}</button></div>
    {error && <p className="error-copy" role="alert">{error}</p>}
    <p className="muted">Approval creates a new persisted finding linked to the original evidence. It does not yet send Linear, Slack, Zapier, GitHub, or portfolio actions.</p>
  </section>;
}
