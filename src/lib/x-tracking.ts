export type XTrackingMetric = {
  label: string;
  source: string;
  status: "available" | "planned" | "not-available";
  note: string;
};

export const xTrackingMetrics: XTrackingMetric[] = [
  { label: "Public engagement", source: "X API v2", status: "available", note: "Likes, reposts, replies, quotes, and bookmarks where returned by the endpoint." },
  { label: "Private post metrics", source: "X API v2 + user OAuth", status: "planned", note: "Impressions and clicks for Stephen's own posts; access and retention limits apply." },
  { label: "Thread identity", source: "conversation_id", status: "available", note: "Keeps a thread together so a result is not assigned to one post in isolation." },
  { label: "Note visits", source: "stephenmantle.com events", status: "planned", note: "First-party link and page events connect X posts to the durable Notes asset." },
];

export const xTrackingStages = [
  ["Register", "Record post URL, post ID, conversation ID, publish time, hook, and linked Notes page."],
  ["Enrich", "Read the account's own post metrics through OAuth; batch requests and respect X rate-limit headers."],
  ["Join", "Join X measurements to first-party note visits and outbound clicks using a campaign and post key."],
  ["Learn", "Compare attention, useful response, durable visits, and next actions without treating reach as business proof."],
] as const;

export const xTrackingConnections = [
  { name: "X API", role: "Post identity and account metrics", state: "Planned" },
  { name: "Supabase", role: "Private measurement ledger and snapshots", state: "Existing" },
  { name: "Site events", role: "Note visits and outbound click evidence", state: "Planned" },
  { name: "Notion + Linear", role: "Campaign context, decisions, and follow-up work", state: "Existing" },
  { name: "Firecrawl", role: "Validate the linked public Notes page", state: "Existing" },
] as const;
