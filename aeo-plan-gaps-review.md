# AEO Growth Loop — plan review and gaps

Date: 2026-08-24. Reviewed against the live site, the GitHub repo, and the local working copy.

## Verdict

Good plan for a system. Wrong plan for right now. It designs a measuring machine
for pages that no crawler can currently read, in a repo that is private, from a
local copy that does not match what is live.

## Blocking facts (checked, not assumed)

| Fact | Evidence |
|---|---|
| GitHub repo is **private** | `gh api repos/stephenmantle75-lang/stephenmantle-web` → `"private": true` |
| Local `main` is **12 commits ahead** of GitHub; GitHub is what deploys | `git log origin/main..main` — 12 commits, incl. the whole AI back-office section |
| Unknown URLs return **200, not 404** | `curl -o /dev/null -w "%{http_code}" https://www.stephenmantle.com/this-does-not-exist-xyz` → `200` |
| Canonical tag points at a host that redirects away | canonical = `https://stephenmantle.com/`, which 307s to `www.` |
| Every route serves the same ~2.3KB empty shell | `curl .../studio-os-control-plane \| wc -c` → 2286 bytes |
| `/services` is in `sitemap.xml` but has no route locally | `ServicesPage` defined at `src/App.tsx:1785`, never rendered |
| ~25MB of video committed into git history | `public/work/hermes/hermes-chain.mp4` etc., repo 38MB |

## The 10 gaps

1. **Private repo kills Surface D.** "Public repository" is a core proof surface. Phase 0 has no "make it public, scrub it first" task.
2. **Three versions of the site exist.** Local ≠ GitHub ≠ live. Reconcile before measuring anything.
3. **Baseline would measure a broken page.** Firecrawl/Exa on a 2.3KB JS shell records the shell, not the content. Every later gain looks enormous because the start was zero — an accidental fabricated performance claim, which the plan's own guardrail forbids.
4. **No control.** 3 topics, 1 page each, no unchanged holdout. One inbound link moves the numbers more than any edit. Keep one topic frozen for 90 days as a control.
5. **Citation checks run once = coin flip.** Record a *rate* over N runs per prompt, not a yes/no.
6. **Daily cron on weekly-moving data.** Search Console lags 2–3 days and needs 8–12 weeks to trend on a new domain. Weekly for search, daily only for crawl health.
7. **No cost ceiling.** 3 topics × 10 prompts daily is 30+ model calls before crawls. Set a hard monthly cap and a kill switch in Phase 2, not later.
8. **18 tables and 7 agents for 3 pages.** Start with 3 tables (`runs`, `observations`, `findings`) and one collect script + one analyse prompt.
9. **The Builder agent (auto-draft PRs) is the highest risk, lowest value item — and it sits in the core loop.** Cut it until the loop produces more findings than one person can hand-fix.
10. **No failure story.** If nothing gets cited in 12 weeks (the likely outcome for a new low-authority domain) the plan has no exit. Define the honest-negative-result write-up upfront — it reads better to a hiring manager than a success story.

## Two documents disagree

- `stephenmantle-portfolio-review.md`: "Do not build a second AEO site before fixing the public rendering layer."
- `aeo-growth-loop-plan.md` §11: a separate `aeo-growth-loop/` repo with its own `app/(public)/page.tsx` — i.e. a second site.

Decide: one repo (portfolio, AEO as a case study inside it) or two. Recommendation: one.

## Plan vs the new brief ("remove anything that is a sell")

Phase 0 task 3 requires defining a conversion event. With the sell removed, the
conversion becomes GitHub click / contact click / case-study read-through —
not "book a call". Update Phase 0 before starting it.

## Why the current site breaks on every change

Route truth is stored by hand in five places:

1. `type RoutePath` union — `src/App.tsx:568`
2. `normalizePath()` allow-list — `src/App.tsx:1071`
3. `vercel.json` redirects + the catch-all rewrite `/(.*) → /`
4. `public/sitemap.xml`
5. the nav links array

Add a page, edit five places, no test catches a miss. It already broke: `/services`
is still in the sitemap while its 334-line page component is orphaned.

Second cause: one 5,150-line `src/App.tsx` holding routing, all content, quiz
scoring, forms, layout and footer. Nothing is isolated, so nothing can be changed safely.

## Recommended sequence

1. Rebuild the site as a **new public repo**, Astro (or Next static), content as
   markdown files so routes come from the filesystem — one source of route truth,
   real 404s, real HTML per page.
2. Ship it: `/`, `/work/[slug]`, `/about`, `/journal/[slug]`. Homepage = who he is
   + 3–5 pieces of work. No services page, no booking CTA, no lead capture.
3. CI: typecheck, build, link check, secret scan. One workflow file.
4. Only then start AEO — as case study #1, marked "building" and honest.
