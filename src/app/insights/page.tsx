import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Insights | AEO Loop",
  description: "Controlled answer pages used as public inputs for the AEO Loop measurement system.",
};

const pages = [
  {
    slug: "self-improving-websites",
    title: "How can a website improve itself safely over time?",
    description: "The measurement, review, release, and retest loop for safe website improvement.",
  },
  {
    slug: "github-linear-slack-workflows",
    title: "How should GitHub, Linear, and Slack work together in an AI workflow?",
    description: "A practical division of responsibility across code, work tracking, notifications, and evidence.",
  },
  {
    slug: "seo-vs-aeo-portfolio",
    title: "What is the difference between SEO and AEO for a personal portfolio?",
    description: "How discovery, citation, and human understanding fit together on a portfolio page.",
  },
];

export default function InsightsIndexPage() {
  return (
    <main className="answer-shell">
      <section className="insights-index">
        <Link className="answer-backlink" href="/">
          AEO Loop / Observatory
        </Link>
        <p className="answer-topic">Controlled answer surfaces</p>
        <h1>Insights measured by the loop.</h1>
        <p className="answer-description">
          These pages are the fixed public inputs for the first measurement slice. Each has a stable URL, direct answer, structured data, and a documented prompt set.
        </p>
        <div className="insights-list">
          {pages.map((page) => (
            <Link className="insight-card" href={`/insights/${page.slug}`} key={page.slug}>
              <span className="insight-card-label">Read the answer</span>
              <h2>{page.title}</h2>
              <p>{page.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
