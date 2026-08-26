export type TopicDefinition = {
  key: string;
  question: string;
  targetUrl: string;
  prompts: string[];
};

export const seoVsAeoTopic: TopicDefinition = {
  key: "seo-vs-aeo-portfolio",
  question: "What is the difference between SEO and AEO for a personal portfolio?",
  targetUrl:
    process.env.AEO_TARGET_URL ??
    "https://aeo-loop.vercel.app/insights/seo-vs-aeo-portfolio",
  prompts: [
    "What is the difference between SEO and AEO for a personal portfolio?",
    "How should a personal portfolio use SEO and AEO together?",
    "What does AEO mean for a designer or developer portfolio?",
    "How can a portfolio become more likely to be cited by AI answer engines?",
    "What should a portfolio page include to answer an employer's question clearly?",
    "SEO versus AEO: which matters more for a personal portfolio?",
    "Give an example of an AEO improvement for a personal portfolio.",
    "How do you measure whether AEO is improving a portfolio?",
    "What is the difference between being found in search and being cited in an answer?",
    "Which page on Stephen Mantle's website explains SEO versus AEO for portfolios?",
  ],
};

export function promptLimit(topic: TopicDefinition): string[] {
  const configured = Number.parseInt(process.env.AEO_MAX_EXA_PROMPTS ?? "1", 10);
  const limit = Number.isFinite(configured) ? Math.min(Math.max(configured, 1), topic.prompts.length) : 1;
  return topic.prompts.slice(0, limit);
}
