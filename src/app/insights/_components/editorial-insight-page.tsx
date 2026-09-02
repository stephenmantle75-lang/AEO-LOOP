import Image from "next/image";
import Link from "next/link";
import type { AnswerPageContent } from "./answer-page";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aeo-loop.vercel.app";

function pageUrl(content: AnswerPageContent) {
  return `${siteUrl}/insights/${content.slug}`;
}

export function EditorialInsightPage({ content }: { content: AnswerPageContent }) {
  if (!content.editorial) return null;

  const editorial = content.editorial;
  const url = pageUrl(content);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: content.title,
        description: content.description,
        image: { "@id": `${url}#hero` },
        author: { "@id": `${siteUrl}/#stephen-mantle` },
        datePublished: content.published,
        dateModified: content.modified,
        articleSection: content.topic,
        mainEntityOfPage: { "@id": url },
        url,
      },
      {
        "@type": "Person",
        "@id": `${siteUrl}/#stephen-mantle`,
        name: "Stephen Mantle",
        jobTitle: "Website designer and builder",
        url: siteUrl,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "AEO Loop",
        url: siteUrl,
        publisher: { "@id": `${siteUrl}/#stephen-mantle` },
      },
      {
        "@type": "ImageObject",
        "@id": `${url}#hero`,
        url: `${siteUrl}${editorial.hero.src}`,
        caption: editorial.hero.alt,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Insights", item: `${siteUrl}/insights` },
          { "@type": "ListItem", position: 2, name: content.title, item: url },
        ],
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
    <div className="editorial-page">
      <header className="editorial-nav">
        <Link className="editorial-brand" href="/insights">
          <span className="editorial-brand-mark" aria-hidden="true">A</span>
          <span>AEO LOOP</span>
        </Link>
        <nav aria-label="Article navigation">
          <Link href="/insights">Insights</Link>
          <Link href="/">Observatory</Link>
        </nav>
      </header>

      <main>
        <section className="editorial-hero" aria-labelledby="editorial-title">
          <div className="editorial-hero-copy">
            <p className="editorial-kicker">{content.topic}</p>
            <h1 id="editorial-title">{content.title}</h1>
            <p className="editorial-deck">{content.description}</p>
            <div className="editorial-byline">
              <span>By Stephen Mantle</span>
              <span>Updated {content.modified}</span>
              <span>{editorial.readTime}</span>
            </div>
          </div>
          <figure className="editorial-hero-figure">
            <Image src={editorial.hero.src} alt={editorial.hero.alt} width={1600} height={900} priority />
          </figure>
        </section>

        <div className="editorial-layout">
          <aside className="editorial-sidebar">
            <section className="editorial-author" aria-labelledby="author-heading">
              {editorial.authorImage ? (
                <Image src={editorial.authorImage} alt="" width={72} height={72} className="editorial-author-image" />
              ) : null}
              <p className="editorial-sidebar-label" id="author-heading">About the author</p>
              <strong>Stephen Mantle</strong>
              <p>{editorial.authorRole}</p>
              <p className="editorial-author-proof">{editorial.authorProof}</p>
            </section>

            <nav className="editorial-toc" aria-label="On this page">
              <p className="editorial-sidebar-label">On this page</p>
              <ol>
                {content.sections.map((section) => (
                  <li key={section.id ?? section.heading}>
                    <a href={`#${section.id ?? section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                      {section.heading}
                    </a>
                  </li>
                ))}
                <li><a href="#faq">Frequently asked questions</a></li>
              </ol>
            </nav>
          </aside>

          <article className="editorial-article">
            <section className="editorial-answer" aria-labelledby="quick-answer-heading">
              <p className="editorial-sidebar-label" id="quick-answer-heading">The short answer</p>
              <p>{content.answer}</p>
            </section>

            <section className="editorial-evidence-grid" aria-label="Evidence summary">
              {editorial.evidenceCards.map((card) => (
                <div className="editorial-evidence-card" key={card.label}>
                  <p>{card.label}</p>
                  <strong>{card.value}</strong>
                  <span>{card.detail}</span>
                </div>
              ))}
            </section>

            <div className="editorial-sections">
              {content.sections.map((section) => {
                const id = section.id ?? section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                return (
                  <section className="editorial-section" id={id} key={section.heading}>
                    <h2>{section.heading}</h2>
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                    {section.bullets ? (
                      <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
                    ) : null}
                    {section.evidence ? <p className="editorial-evidence-note">{section.evidence}</p> : null}
                    {section.figure ? (
                      <figure className="editorial-figure">
                        <Image src={section.figure.src} alt={section.figure.alt} width={1363} height={1318} />
                        <figcaption>{section.figure.caption}</figcaption>
                      </figure>
                    ) : null}
                  </section>
                );
              })}
            </div>

            <section className="editorial-method" aria-labelledby="method-heading">
              <p className="editorial-sidebar-label" id="method-heading">How to read this</p>
              <p>{editorial.methodology}</p>
            </section>

            <section className="editorial-faq" id="faq" aria-labelledby="faq-heading">
              <h2 id="faq-heading">Frequently asked questions</h2>
              {content.faqs.map((faq) => (
                <div className="editorial-faq-item" key={faq.question}>
                  <h3>{faq.question}</h3>
                  <p>{faq.answer}</p>
                </div>
              ))}
            </section>

            <section className="editorial-cta" aria-labelledby="cta-heading">
              <div>
                <p className="editorial-sidebar-label">Next step</p>
                <h2 id="cta-heading">{editorial.cta.label}</h2>
                <p>{editorial.cta.description}</p>
              </div>
              <Link className="editorial-button" href={editorial.cta.href}>Open the Observatory</Link>
            </section>

            <section className="editorial-related" aria-labelledby="related-heading">
              <h2 id="related-heading">Keep reading</h2>
              <div className="editorial-related-list">
                {editorial.related.map((item) => (
                  <Link href={item.href} key={item.href}>
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </Link>
                ))}
              </div>
            </section>
          </article>
        </div>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </div>
  );
}
