# ADR-0001: Separate delivery tracking from project knowledge

## Status

Accepted

## Date

2026-08-30

## Context

AEO LOOP now spans code, deployments, scheduled observations, evidence,
findings, experiments, and research. Linear is already used for project phases
and actionable issues, while Notion is better suited to long-form operating
pages, visual explanations, templates, and durable research context.

Putting every kind of information in one tool would either make execution hard
to manage or make the technical and operational context difficult to revisit.
Duplicating live status and evidence across tools would also create drift.

## Decision

Use each system for the class of truth it is best suited to own:

- Linear owns issues, status, dependencies, milestones, blockers, and delivery
  accountability.
- GitHub owns source code, branches, pull requests, and CI history.
- Supabase owns run, observation, finding, review, report, and cost data.
- Vercel owns deployment and runtime execution evidence.
- This repository and the private Notion control plane own technical
  explanation, research context, SOPs, templates, and decision rationale.

Link the systems where useful, but do not build bidirectional synchronisation
or copy private raw data into documentation by default.

## Alternatives considered

### Use Linear for everything

- **Advantage:** one visible workspace for all project information.
- **Rejected because:** Linear is strongest for execution state; long-form
  visual operating manuals and reusable knowledge are less natural there.

### Use Notion for everything

- **Advantage:** flexible pages, databases, templates, and visual hierarchy.
- **Rejected because:** task accountability, dependency tracking, PR linkage,
  and delivery state should remain close to the execution workflow in Linear.

### Synchronise Linear and Notion bidirectionally

- **Advantage:** each tool could show a copy of the other system’s state.
- **Rejected because:** synchronisation adds failure modes and stale or
  conflicting status. Links and intentional summaries are sufficient for the
  current team and project size.

## Consequences

### Positive

- Future operators can learn the system from the repository and Notion pages.
- Linear stays focused on what must happen next.
- Supabase remains authoritative for evidence and reporting data.
- Private records and credentials are less likely to leak into documentation.
- The same experiment and incident procedures can be reused across phases.

### Tradeoffs

- Operators must know which system to consult.
- Some context exists as links rather than one combined page.
- Notion pages and repository docs need occasional review when the operating
  model changes.

## Review trigger

Revisit this decision if the team needs automated cross-system synchronisation,
more than one operating team, customer-facing knowledge access, or a formal
data catalog. Until then, one source of truth per information class is the
lower-risk operating model.
