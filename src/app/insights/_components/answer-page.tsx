import Link from "next/link";

type FaqItem = {
  question: string;
  answer: string;
};

export type AnswerPageContent = {
  title: string;
  description: string;
  slug: string;
  published: string;
  modified: string;
  topic: string;
  answer: string;
  sections: Array<{
    heading: string;
    paragraphs: string[];
    bullets?: string[];
  }>;
  faqs: FaqItem[];
};

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aeo-loop.vercel.app";

export function AnswerPage({ content }: { content: AnswerPageContent }) {
  const pageUrl = `${siteUrl}/insights/${content.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: content.title,
        description: content.description,
        author: { "@type": "Person", name: "Stephen Mantle" },
        datePublished: content.published,
        dateModified: content.modified,
        mainEntityOfPage: pageUrl,
        url: pageUrl,
      },
      {
        "@type": "FAQPage",
        mainEntity: content.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };

  return (
    <main className="answer-shell">
      <article className="answer-article">
        <header className="answer-header">
          <Link className="answer-backlink" href="/insights">
            AEO Loop / Insights
          </Link>
          <p className="answer-topic">{content.topic}</p>
          <h1>{content.title}</h1>
          <p className="answer-description">{content.description}</p>
          <p className="answer-byline">
            By Stephen Mantle · Updated {content.modified}
          </p>
        </header>

        <section className="answer-direct" aria-labelledby="direct-answer-heading">
          <p className="answer-label" id="direct-answer-heading">
            Direct answer
          </p>
          <p>{content.answer}</p>
        </section>

        <div className="answer-sections">
          {content.sections.map((section) => (
            <section className="answer-section" key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <section className="answer-section answer-faq" aria-labelledby="faq-heading">
          <h2 id="faq-heading">Frequently asked questions</h2>
          {content.faqs.map((faq) => (
            <div className="answer-faq-item" key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </div>
          ))}
        </section>

        <footer className="answer-footer">
          <p>
            This page is one of the controlled answer surfaces measured by the AEO Loop.
          </p>
          <nav aria-label="Related links">
            <Link href="/insights">Browse all insights</Link>
            <Link href="/">Open the Observatory</Link>
          </nav>
        </footer>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
