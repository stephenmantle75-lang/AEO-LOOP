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

## Secret boundary

GitHub Actions receives no production provider credentials for the current
quality gate. The application runtime continues to keep `CRON_SECRET`,
`SUPABASE_SERVICE_ROLE_KEY`, `FIRECRAWL_API_KEY`, and `EXA_API_KEY` in Vercel
Production environment variables only.
