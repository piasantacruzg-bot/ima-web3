// Client-safe sort option definitions for the campaigns list — kept out of
// lib/campaigns.ts (which imports the server-only Supabase client) so a
// "use client" filter/sort component can import this without pulling in
// next/headers (the same bug pattern fixed for creators in Phase 2).

export const CAMPAIGN_SORT_OPTIONS = {
  recently_added: { column: "created_at", ascending: false, label: "Recently added" },
  recently_updated: { column: "updated_at", ascending: false, label: "Recently updated" },
  start_date: { column: "start_date", ascending: true, label: "Start date" },
  end_date: { column: "end_date", ascending: true, label: "End date" },
  budget_desc: { column: "budget", ascending: false, label: "Budget (highest)" },
  name_asc: { column: "campaign_name", ascending: true, label: "Name (A-Z)" },
} as const;

export type CampaignSortKey = keyof typeof CAMPAIGN_SORT_OPTIONS;
