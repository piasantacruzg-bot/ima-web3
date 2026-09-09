// Split out of lib/creators.ts so client components (creator-filters.tsx)
// can import the sort option labels without pulling in the server-only
// Supabase client (next/headers can't be bundled client-side).
export const CREATOR_SORT_OPTIONS = {
  followers_desc: { column: "max_followers", ascending: false, label: "Followers" },
  engagement_desc: { column: "avg_engagement_rate", ascending: false, label: "Engagement" },
  avg_views_desc: { column: "max_average_views", ascending: false, label: "Average views" },
  avg_likes_desc: { column: "max_average_likes", ascending: false, label: "Average likes" },
  avg_comments_desc: { column: "max_average_comments", ascending: false, label: "Average comments" },
  avg_shares_desc: { column: "max_average_shares", ascending: false, label: "Average shares" },
  reach_desc: { column: "max_estimated_reach", ascending: false, label: "Estimated reach" },
  brand_fit_desc: { column: "brand_fit_score", ascending: false, label: "Brand fit" },
  rating_desc: { column: "internal_rating", ascending: false, label: "Internal rating" },
  most_campaigns: { column: "campaign_count", ascending: false, label: "Most campaigns" },
  recently_added: { column: "created_at", ascending: false, label: "Date added" },
  last_updated: { column: "updated_at", ascending: false, label: "Last updated" },
} as const;

export type CreatorSortKey = keyof typeof CREATOR_SORT_OPTIONS;
