import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnswerPage } from "../_components/answer-page";
import { EditorialInsightPage } from "../_components/editorial-insight-page";
import { answerPages } from "../content";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aeo-loop.vercel.app";

export function generateStaticParams() {
  return Object.keys(answerPages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const content = answerPages[slug];
  if (!content) return {};

  return {
    title: `${content.title} | AEO Loop`,
    description: content.description,
    alternates: { canonical: `${siteUrl}/insights/${content.slug}` },
    openGraph: {
      title: content.title,
      description: content.description,
      type: "article",
      publishedTime: content.published,
      modifiedTime: content.modified,
      authors: ["Stephen Mantle"],
      ...(content.editorial ? { images: [{ url: `${siteUrl}${content.editorial.hero.src}`, alt: content.editorial.hero.alt }] } : {}),
    },
  };
}

export default async function InsightPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = answerPages[slug];
  if (!content) notFound();
  return content.editorial ? <EditorialInsightPage content={content} /> : <AnswerPage content={content} />;
}
