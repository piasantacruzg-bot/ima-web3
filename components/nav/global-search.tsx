import { Search } from "lucide-react";

// Global search across creators/campaigns/brands/handles/content URLs
// (spec section 37) ships once the Creators and Campaigns modules land in
// Phase 2 — there's no data to search yet. The affordance is shown,
// disabled, so the persistent nav layout is final now.
export function GlobalSearch() {
  return (
    <div className="relative w-72">
      <Search
        size={15}
        strokeWidth={1.75}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft/50"
      />
      <input
        type="search"
        disabled
        placeholder="Search creators, campaigns, handles… (Phase 2)"
        className="w-full cursor-not-allowed rounded-sm border border-line bg-paper py-1.5 pl-8 pr-3 text-sm text-ink-soft/60 placeholder:text-ink-soft/50"
      />
    </div>
  );
}
