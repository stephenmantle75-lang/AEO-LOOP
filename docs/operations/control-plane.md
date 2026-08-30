# AEO LOOP operating control plane

This document records how the project is operated across Linear, GitHub,
Supabase, Vercel, and the private knowledge layer. It is deliberately kept in
the repository so a future operator can recover the system model without
depending on a single external workspace.

## What each system owns

| System | Source of truth | Belongs there | Does not belong there |
|---|---|---|---|
| Linear | Delivery and accountability | Issues, status, priorities, dependencies, milestones, blockers | Live evidence history or credentials |
| GitHub | Code and change history | Source code, branches, pull requests, CI results | Secrets or unreviewed customer data |
| Supabase | Runtime evidence and history | Runs, observations, findings, review events, report data, costs | The only explanation of how the system works |
| Vercel | Runtime and deployment | Production deployments, cron invocations, function logs, API behaviour | Long-term research decisions |
| Notion | Durable project knowledge | Research, SOPs, decisions, templates, visual operating pages | Duplicate task status or private raw data |

The private Notion control-plane pages provide the richer visual operating
manual. Linear remains the place where work is assigned and marked complete.
This repository remains the technical source for the contract, architecture,
migrations, tests, and operational runbooks.

## Architecture flow

```text
Topic and target
  -> scheduled observation
  -> provider collection
  -> normalised evidence
  -> Supabase run ledger
  -> human review
  -> finding or experiment candidate
  -> Linear follow-up
  -> approved GitHub PR
  -> Vercel deployment
  -> follow-up observation
```

The system has four distinct kinds of truth:

1. **Delivery truth** — Linear says what is planned, blocked, or complete.
2. **Code truth** — GitHub says what was changed and what CI verified.
3. **Runtime truth** — Supabase and Vercel say what actually ran and was stored.
4. **Knowledge truth** — this repository and the private Notion pages explain
   why the system is designed this way and how to operate it.

## Daily operator routine

- [ ] Check the current GitHub branch, open pull requests, and required CI.
- [ ] Confirm the latest Vercel production deployment and expected commit.
- [ ] Check whether the scheduled cron request arrived in the expected window.
- [ ] Open the latest run in the Observatory and confirm run-level status.
- [ ] Review provider evidence separately from the aggregate status.
- [ ] Check for missing, partial, or stale evidence before interpreting metrics.
- [ ] Record blockers, failures, and decisions in the relevant Linear issue.
- [ ] Keep provider credentials, service-role keys, and private environment
  values out of commits, issues, documents, and screenshots.

## Experiment and retest routine

An observation cannot measure a page change that has not reached the target
deployment. Use this sequence for portfolio experiments:

1. Record the target URL, page version, topic, and baseline run.
2. Write one content or structural hypothesis.
3. Change the portfolio repository in a reviewable branch.
4. Run local checks and open a GitHub pull request.
5. Merge and deploy only after human review and required checks pass.
6. Confirm the production URL serves the intended page version.
7. Run the same topic against that production URL.
8. Compare inspectability, evidence quality, citations, confidence, and human
   usefulness.
9. Record the result and next decision in Linear.

A zero citation result is an honest baseline, not automatically a pipeline
failure. A successful cron request only proves invocation completed; the stored
run and provider evidence determine whether the observation was useful.

## Reporting boundary

The Observatory should present stored evidence, report state, and review state.
It must not imply that an unimplemented adapter is active or that a single
provider result proves a durable SEO or AEO outcome.

When a reporting change is made, document:

- the input records and provider sources;
- the transformation or KPI definition;
- the output surface and audience;
- the failure or unavailable state;
- the Linear issue or decision that authorized the change.

Slack, Zapier, and other delivery surfaces are downstream presentations. They
must not become a second source of truth for evidence or task status.

## Security and privacy boundary

- `SUPABASE_SERVICE_ROLE_KEY` and provider credentials are server-only.
- Browser code uses only the publishable Supabase key where RLS and grants are
  correctly configured.
- Cron endpoints validate `CRON_SECRET`.
- Raw provider payloads, visitor-level analytics, and private customer data are
  not public DTOs.
- Separate Supabase projects remain isolated until data quality, provenance,
  permissions, and commercial-use rights are reviewed.
- Use a reviewed export or explicit one-time import boundary instead of direct
  cross-project production coupling.

## External project records

- The [AEO LOOP Linear project](https://linear.app/antiangeto/project/aeo-loop-09aedf3aba57)
  tracks delivery work and phase status.
- The [AEO LOOP production dashboard](https://aeo-loop.vercel.app/) exposes the
  deployed review surfaces.
- The private Notion control-plane page contains the richer visual operating
  manual and is intentionally not treated as a public repository dependency.

## Change log

- 2026-08-30 — Added the operating ownership model, cross-system flow, daily
  routine, experiment retest sequence, reporting boundary, and security rules.
