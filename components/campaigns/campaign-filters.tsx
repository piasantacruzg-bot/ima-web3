"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useRef, useTransition } from "react";
import { Search } from "lucide-react";
import { CAMPAIGN_SORT_OPTIONS } from "@/lib/campaign-sort-options";

const STATUSES = ["draft", "proposal", "approved", "recruiting", "active", "completed", "cancelled"] as const;

export function CampaignFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function onSearchChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParam("q", value), 300);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          type="text"
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search campaigns, clients, brands…"
          className="input pl-8"
        />
      </div>
      <select
        className="input w-auto"
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(e) => updateParam("status", e.target.value)}
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s[0].toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>
      <select
        className="input w-auto"
        defaultValue={searchParams.get("sort") ?? "recently_added"}
        onChange={(e) => updateParam("sort", e.target.value)}
      >
        {Object.entries(CAMPAIGN_SORT_OPTIONS).map(([key, opt]) => (
          <option key={key} value={key}>
            {opt.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1.5 text-xs text-ink-soft">
        <input
          type="checkbox"
          checked={searchParams.get("archived") === "1"}
          onChange={(e) => updateParam("archived", e.target.checked ? "1" : "")}
        />
        Show archived
      </label>
    </div>
  );
}
