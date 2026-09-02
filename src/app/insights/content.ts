import type { AnswerPageContent } from "./_components/answer-page";

const updated = "2026-08-26";

export const answerPages: Record<string, AnswerPageContent> = {
  "self-improving-websites": {
    slug: "self-improving-websites",
    topic: "Web systems and continuous improvement",
    title: "How can a website improve itself safely over time?",
    description: "A practical explanation of how measurement, evidence, human review, and controlled releases can improve a website without giving an agent direct production access.",
    published: updated,
    modified: updated,
    answer: "A website can improve safely through a measured feedback loop: collect evidence, turn evidence into a reviewable recommendation, create a proposed change, run automated checks, require human approval, deploy, and measure the result against a control.",
    sections: [
      {
        heading: "What a self-improving website actually means",
        paragraphs: [
          "A self-improving website is not a system that edits its own production files without oversight. It is a system that observes how its pages perform, identifies a specific opportunity, and prepares a change that a person can review before release.",
          "The improvement loop is valuable because every change has a reason, an owner, an approval record, and a later result. That turns website work from a series of guesses into a sequence of testable decisions.",
        ],
      },
      {
        heading: "The safe improvement loop",
        paragraphs: ["A useful loop has seven steps:"],
        bullets: [
          "Collect page, search, citation, and traffic observations.",
          "Store the source, timestamp, query, response status, and freshness for each observation.",
          "Create a finding only when it references the evidence that supports it.",
          "Propose a draft content, metadata, internal-link, schema, or documentation change.",
          "Run lint, type checks, tests, security checks, and a preview deployment.",
          "Have a person approve the proposed change before production deployment.",
          "Run the same measurement again and compare the result with a control topic.",
        ],
      },
      {
        heading: "What should remain human",
        paragraphs: [
          "An agent can collect evidence, summarize patterns, and prepare a pull request. A person should still decide whether a recommendation is accurate, useful, on-brand, and safe to publish. Low-confidence or contradictory evidence should stop the loop for review.",
        ],
      },
      {
        heading: "How improvement should be measured",
        paragraphs: [
          "A single citation or traffic number is not enough to prove improvement. Repeat the same prompts over a defined window, keep the denominator visible, and compare the changed page with an unchanged control. Report citation rate, mention rate, page integrity, search visibility, and human traffic as separate signals.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can an AI agent change a website without approval?",
        answer: "It should not have direct production write access in a safe workflow. The agent can prepare a draft change and pull request, while automated checks and human approval control release.",
      },
      {
        question: "What is the first useful version of this loop?",
        answer: "Start with one controlled topic, one page-integrity check, one discovery or citation check, one stored baseline, and one repeatable retest after a reviewed change.",
      },
    ],
  },
  "github-linear-slack-workflows": {
    slug: "github-linear-slack-workflows",
    topic: "Engineering operations",
    title: "How should GitHub, Linear, and Slack work together in an AI workflow?",
    description: "A clear division of responsibility for turning an AI-generated recommendation into tracked, reviewable engineering work.",
    published: updated,
    modified: updated,
    answer: "GitHub should own code, pull requests, checks, and deployments. Linear should own the work item, decision, and delivery state. Slack should deliver timely pulses and links. A database should remain the source of truth for evidence, IDs, retries, and delivery status.",
    sections: [
      {
        heading: "Give each tool one job",
        paragraphs: [
          "The workflow becomes easier to audit when each tool has a narrow responsibility. GitHub is where code changes are reviewed. Linear is where work is planned and accepted. Slack is where people receive a concise notification. The database preserves the durable record that connects them.",
        ],
        bullets: [
          "GitHub: branch, pull request, checks, review, merge, and deployment references.",
          "Linear: finding, decision, owner, priority, status, and next action.",
          "Slack: daily pulse, critical alert, thread follow-up, and links.",
          "Database: evidence, run IDs, external IDs, delivery attempts, and timestamps.",
        ],
      },
      {
        heading: "The event that connects the tools",
        paragraphs: [
          "A finding-created event should contain an event ID, finding ID, run ID, topic, confidence, dashboard URL, and creation time. Every downstream delivery should be idempotent so a retry does not create duplicate issues or messages.",
          "Slack and Zapier can move the event, but they should not recalculate KPIs or become the source of truth. The database records whether the delivery succeeded, failed, or was retried.",
        ],
      },
      {
        heading: "What a useful Slack pulse contains",
        paragraphs: [
          "A daily pulse should be short enough to scan while retaining the evidence needed to act. Include run health, meaningful KPI deltas, the measurement window, the biggest measurable leak, the next action, freshness, cost, and links to the dashboard, run, and finding.",
        ],
      },
      {
        heading: "Why human approval still matters",
        paragraphs: [
          "The integration should make the right work easier to review, not hide decisions behind automation. A person approves the finding, reviews the pull request, and decides whether the result is strong enough to publish or whether the evidence calls for another experiment.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is Slack the system of record?",
        answer: "No. Slack is a notification and discussion surface. The durable evidence and delivery state belong in the database, with links back to Linear, GitHub, and the dashboard.",
      },
      {
        question: "Where should CI checks run?",
        answer: "CI checks should run in GitHub Actions on the pull request and before merge. The resulting check URLs and deployment references should be linked back to the tracked Linear work item.",
      },
    ],
  },
  "seo-vs-aeo-portfolio": {
    slug: "seo-vs-aeo-portfolio",
    topic: "Search and answer visibility",
    title: "What is the difference between SEO and AEO for a personal portfolio?",
    description: "A practical comparison of search engine optimization and answer engine optimization for a portfolio that needs to be found, understood, and cited.",
    published: updated,
    modified: updated,
    answer: "SEO helps a portfolio be discovered and ranked in search results. AEO helps the same portfolio provide clear, extractable answers that an AI or answer engine can understand and cite. They overlap in quality and crawlability, but they measure different outcomes.",
    sections: [
      {
        id: "seo-and-aeo-ask-different-questions",
        heading: "SEO and AEO answer different questions",
        paragraphs: [
          "SEO asks whether the right person can find a page through a search engine. AEO asks whether an answer engine can retrieve the page, understand its claims, and attribute the answer to it. A strong portfolio should be easy for both people and machines to interpret.",
        ],
        evidence: "First-party evidence: this page is designed as a crawlable, canonical answer surface inside the AEO LOOP project.",
      },
      {
        id: "seo-versus-aeo",
        heading: "SEO versus AEO",
        paragraphs: ["The distinction is easiest to see as a comparison:"],
        bullets: [
          "SEO outcome: impressions, clicks, rankings, and qualified visits.",
          "AEO outcome: mentions, citations, answer inclusion, and accurate attribution.",
          "SEO foundation: crawlable pages, useful content, links, performance, and technical quality.",
          "AEO addition: direct answers, clear headings, self-contained passages, source context, and repeatable citation checks.",
        ],
        figure: {
          src: "/insights/aeo/seo-aeo-article.png",
          alt: "Editorial comparison diagram showing how SEO helps people find a page and AEO helps answer engines explain it.",
          caption: "One page can do both jobs when the route to the page and the answer inside it are clear.",
        },
      },
      {
        id: "what-an-aeo-ready-page-includes",
        heading: "What an AEO-ready portfolio page includes",
        paragraphs: [
          "A portfolio page should state what the work is, who it was for, what changed, and what evidence supports the result. Use a clear title, a direct opening answer, descriptive headings, concise paragraphs, meaningful internal links, and structured data that accurately describes the page.",
          "Do not create thin pages for every keyword or write only for a crawler. Helpful, people-first content remains the foundation. The answer structure should make the page clearer for an employer while also making the main claims easier to retrieve.",
        ],
        evidence: "The AEO LOOP article template keeps the human explanation and machine-readable structure in the same page rather than creating separate versions.",
      },
      {
        id: "how-to-measure-aeo",
        heading: "How to measure AEO without overstating the result",
        paragraphs: [
          "Run a fixed set of prompts repeatedly and record whether the target page was mentioned or cited. Report the numerator, denominator, provider, query, date, and freshness. Keep synthetic discovery evidence separate from Search Console and human analytics, because those signals describe different parts of the journey.",
        ],
        figure: {
          src: "/insights/aeo/observatory-overview.png",
          alt: "AEO LOOP Observatory overview showing a successful run, citation rate, evidence captured, and open findings.",
          caption: "The Observatory stores the measurement context so a citation result can be reviewed instead of treated as a floating number.",
        },
        evidence: "The dashboard screenshot is a real project artifact. It demonstrates the measurement surface, not a guaranteed citation outcome.",
      },
    ],
    faqs: [
      {
        question: "Does AEO replace SEO for a portfolio?",
        answer: "No. AEO builds on SEO fundamentals. A portfolio still needs crawlable, useful, technically sound pages, while AEO adds emphasis on direct answers, extractable structure, and citation measurement.",
      },
      {
        question: "What is one simple AEO improvement for a portfolio?",
        answer: "Rewrite the opening of a project page so it directly answers what the project does, who it helps, and what evidence demonstrates the outcome. Then measure whether the page is retrieved and cited for fixed prompts.",
      },
    ],
    editorial: {
      hero: {
        src: "/insights/aeo/observatory-overview.png",
        alt: "AEO LOOP Observatory dashboard showing the evidence-backed measurement system.",
      },
      readTime: "5 min read",
      authorRole: "Website designer and builder creating evidence-backed improvement systems.",
      authorProof: "This article documents the AEO LOOP project and its real workflow: collection, evidence storage, human review, delivery, and retest.",
      authorImage: "/insights/stephen.png",
      evidenceCards: [
        { label: "SEO job", value: "Find the page", detail: "Search visibility, crawlability, performance, and useful links." },
        { label: "AEO job", value: "Explain the answer", detail: "Direct language, question headings, evidence, and attribution." },
        { label: "Project proof", value: "Measure the gap", detail: "The Observatory stores provider, query, date, status, and result." },
      ],
      methodology: "AEO LOOP keeps discovery checks, page-integrity checks, human analytics, and production outcomes as separate signals. A captured observation proves what was measured at a point in time. It does not prove that one page will always be cited.",
      related: [
        { href: "/insights/self-improving-websites", label: "How can a website improve itself safely over time?", description: "The controlled loop behind collection, review, release, and retest." },
        { href: "/insights/github-linear-slack-workflows", label: "How should GitHub, Linear, and Slack work together?", description: "The ownership model connecting evidence to action." },
      ],
      cta: {
        label: "See the evidence behind the answer",
        href: "/",
        description: "Open the Observatory to review runs, sources, findings, and delivery state from stored data.",
      },
    },
  },
};
