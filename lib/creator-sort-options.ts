// Split out of lib/creators.ts so client components (creator-filters.tsx)
// can import the sort option labels without pulling in the server-only
// Supabase client (next/headers can't be bundled client-side).
export const CREATOR_SORT_OPTIONS = {
  followers_desc: { column: "max_followers", ascending: false, label: "Followers" },
  engagement_desc: { column: "avg_engagement_rate", ascending: false, label: "Engagement" },
  avg_views_desc: { column: "max_average_views", ascending: false, label: "Average views" },
  reach_desc: { column: "max_estimated_reach", ascending: false, label: "Estimated reach" },
  most_campaigns: { column: "campaign_count", ascending: false, label: "Most campaigns" },
  recently_added: { column: "created_at", ascending: false, label: "Recently added" },
} as const;

export type CreatorSortKey = keyof typeof CREATOR_SORT_OPTIONS;
