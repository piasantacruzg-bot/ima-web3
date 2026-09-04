"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

// Searches creators by name today. Campaigns/brands/handles/content URLs
// join once those modules exist (spec section 37) — this isn't a fake
// search box, it's just scoped to what's actually indexed so far.
export function GlobalSearch() {
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value;
        router.push(`/creators?q=${encodeURIComponent(q)}`);
      }}
      className="relative w-72"
    >
      <Search
        size={15}
        strokeWidth={1.75}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft/50"
      />
      <input
        type="search"
        name="q"
        placeholder="Search creators…"
        className="w-full rounded-sm border border-line bg-paper py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-ink-soft/50 focus:border-ink/40 focus:outline-none"
      />
    </form>
  );
}
