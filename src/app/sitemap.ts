import type { MetadataRoute } from "next";

const slugs = [
  "self-improving-websites",
  "github-linear-slack-workflows",
  "seo-vs-aeo-portfolio",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aeo-loop.vercel.app";
  const modified = new Date("2026-08-26T00:00:00.000Z");
  return [
    { url: `${baseUrl}/`, lastModified: modified, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/insights`, lastModified: modified, changeFrequency: "weekly", priority: 0.8 },
    ...slugs.map((slug) => ({
      url: `${baseUrl}/insights/${slug}`,
      lastModified: modified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
