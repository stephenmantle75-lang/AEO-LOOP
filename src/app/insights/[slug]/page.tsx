import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnswerPage } from "../_components/answer-page";
import { answerPages } from "../content";

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
    alternates: { canonical: `/insights/${content.slug}` },
    openGraph: {
      title: content.title,
      description: content.description,
      type: "article",
      publishedTime: content.published,
      modifiedTime: content.modified,
      authors: ["Stephen Mantle"],
    },
  };
}

export default async function InsightPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = answerPages[slug];
  if (!content) notFound();
  return <AnswerPage content={content} />;
}
