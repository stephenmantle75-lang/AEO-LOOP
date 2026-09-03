export type TopicDefinition = {
  key: string;
  question: string;
  targetUrl: string;
  prompts: string[];
};

export const defaultAeoTargetUrl =
  "https://www.stephenmantle.com/insights/seo-vs-aeo-portfolio";

export const defaultAeoVariantTargetUrl =
  "https://www.stephenmantle.com/insights/seo-vs-aeo-portfolio-variant-b";

export const seoVsAeoTopic: TopicDefinition = {
  key: "seo-vs-aeo-portfolio",
  question: "What is the difference between SEO and AEO for a personal portfolio?",
  targetUrl:
    process.env.AEO_TARGET_URL ??
    defaultAeoTargetUrl,
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

export const seoVsAeoVariantTopic: TopicDefinition = {
  key: "seo-vs-aeo-portfolio-variant-b",
  question: seoVsAeoTopic.question,
  targetUrl: process.env.AEO_VARIANT_TARGET_URL ?? defaultAeoVariantTargetUrl,
  prompts: [...seoVsAeoTopic.prompts],
};

function portfolioOrigin(): string {
  try {
    return new URL(process.env.AEO_TARGET_URL ?? defaultAeoTargetUrl).origin;
  } catch {
    return new URL(defaultAeoTargetUrl).origin;
  }
}

const portfolioBase = portfolioOrigin();

export const selfImprovingWebsiteTopic: TopicDefinition = {
  key: "self-improving-website",
  question: "How can a website designer build a self-improving website?",
  targetUrl: `${portfolioBase}/insights/self-improving-website`,
  prompts: [
    "How can a website designer build a self-improving website?",
    "What makes a website improvement loop measurable?",
    "How should a portfolio website learn from visitor and search evidence?",
    "What is an example of a self-improving website workflow?",
    "How can a designer improve a website without guessing?",
    "What data should a website record before making improvements?",
    "How do experiments improve a personal website over time?",
    "What is the safest way to automate website improvements?",
    "How can a website turn feedback into better content?",
    "Which page explains how a website can improve itself?",
  ],
};

export const githubLinearSlackTopic: TopicDefinition = {
  key: "github-linear-slack-website-loop",
  question: "How do GitHub, Linear, and Slack work together in a website improvement loop?",
  targetUrl: `${portfolioBase}/insights/github-linear-slack-website-loop`,
  prompts: [
    "How do GitHub, Linear, and Slack work together in a website improvement loop?",
    "How can Linear and GitHub coordinate website changes?",
    "What role does Slack play in a GitHub website workflow?",
    "How should an automated website finding become a GitHub pull request?",
    "What is a safe CI/CD workflow for evidence-backed website changes?",
    "How can a team track website experiments with Linear and GitHub?",
    "How do Slack notifications fit into a review-first development process?",
    "What should be automated between research, issues, and pull requests?",
    "How can GitHub Actions protect an automated website improvement loop?",
    "Which page explains the GitHub, Linear, and Slack website workflow?",
  ],
};

export const knownTopics: TopicDefinition[] = [
  seoVsAeoTopic,
  seoVsAeoVariantTopic,
  selfImprovingWebsiteTopic,
  githubLinearSlackTopic,
];

export function topicForKey(key: string): TopicDefinition | null {
  return knownTopics.find((topic) => topic.key === key) ?? null;
}

export function experimentRunKey(topicKey: string, startedAt: string, nonce: string): string {
  return `experiment:${topicKey}:${startedAt}:${nonce}`;
}

export function dailyComparisonKey(dateKey: string): string {
  return `seo-vs-aeo:daily:${dateKey}`;
}

function boundedPromptLimit(topic: TopicDefinition, rawValue: string | number | undefined, fallback: number): string[] {
  const configured = typeof rawValue === "number" ? rawValue : Number.parseInt(rawValue ?? String(fallback), 10);
  const limit = Number.isFinite(configured) ? Math.min(Math.max(configured, 1), topic.prompts.length) : fallback;
  return topic.prompts.slice(0, limit);
}

/** Keep scheduled collection cheap and predictable unless explicitly expanded. */
export function promptLimit(topic: TopicDefinition, override?: number): string[] {
  return boundedPromptLimit(topic, override ?? process.env.AEO_MAX_EXA_PROMPTS, 1);
}

/** Manual paired experiments use the complete fixed prompt set by default. */
export function experimentPromptLimit(topic: TopicDefinition): string[] {
  return boundedPromptLimit(topic, process.env.AEO_EXPERIMENT_MAX_EXA_PROMPTS, topic.prompts.length);
}
