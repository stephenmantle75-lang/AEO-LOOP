# CI/CD and security operating model

This repository now has an enforceable quality and security path before code
can move from GitHub to the Observatory deployment.

## Flow

```text
Pull request
    ↓
GitHub Actions
    ├─ lint → typecheck → tests → production build
    ├─ pnpm audit (high/critical dependency vulnerabilities)
    ├─ dependency review (new vulnerable packages)
    └─ CodeQL (JavaScript/TypeScript analysis)
    ↓
Required checks pass + human review
    ↓
Merge to protected main
    ↓
Vercel Git deployment
    ↓
Observatory smoke test + next scheduled observation
```

## What is checked

| Control | Workflow | Purpose |
| --- | --- | --- |
| Quality gate | `ci.yml` | Prevent broken lint, types, tests, or builds from merging |
| Dependency audit | `ci.yml` | Fail on high-severity known package vulnerabilities |
| Dependency review | `dependency-review.yml` | Review newly introduced vulnerable dependencies |
| Code scanning | `codeql.yml` | Find supported JavaScript/TypeScript security patterns |
| Updates | `dependabot.yml` | Keep npm and GitHub Actions dependencies current |
| Secret handling | GitHub/Vercel settings + `SECURITY.md` | Keep credentials out of commits, logs, and browser code |

## Required GitHub settings

After the first workflow runs, protect `main` in GitHub and require these
checks before merge:

- `Quality gate`
- `Analyze JavaScript and TypeScript`
- `Review dependency changes`

Also enable secret scanning and push protection where available. Vercel should
be connected to this repository with previews for pull requests and production
deployment from `main`. GitHub Actions is CI; Vercel is CD. Neither replaces
the other.

## When a pull-request check does not start

Changing the branch ruleset changes merge eligibility; it does not dispatch a
new workflow run. A new pull-request `synchronize` event (a new commit pushed
to the source branch) is required to create fresh CI, CodeQL, and dependency
review runs.

If a run remains queued without creating a job, or a job is cancelled after
the configured 15-minute window, the failure is runner allocation rather than
an application lint, test, build, or dependency result. Do not respond by
creating duplicate runs, repeatedly closing and reopening the pull request, or
loosening the required checks. Inspect the run and repository Actions settings,
then escalate a repeated runner-allocation timeout to GitHub if a fresh
legitimate push shows the same behavior.

Required status-check names must match the check contexts produced by the
workflows. For this repository they are `Quality gate`, `Review dependency
changes`, and `Analyze JavaScript and TypeScript`; the old `CodeQL` context is
not produced by the current workflow and must not be required.

## Secret boundary

GitHub Actions receives no production provider credentials for the current
quality gate. The application runtime continues to keep `CRON_SECRET`,
`SUPABASE_SERVICE_ROLE_KEY`, `FIRECRAWL_API_KEY`, and `EXA_API_KEY` in Vercel
Production environment variables only.

## Provider output boundary

Provider responses are treated as untrusted input. Citation links are accepted
only when they are valid HTTPS URLs without embedded credentials; rejected links
are counted in the observation metrics and are not stored as citations. Raw
provider or database exception text is not rendered by the Observatory. The
collector stores stable operational messages, while the page boundary allows
only a small explicit list of safe messages and falls back to a generic
instruction to inspect server logs.

This keeps a useful diagnosis visible — for example, an Exa HTTP 429 or a
Firecrawl retry failure — without exposing provider internals, database schema
details, tokens, or request secrets in HTML.
