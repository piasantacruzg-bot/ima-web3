"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useRef, useTransition } from "react";
import { Search } from "lucide-react";
import { CREATOR_SORT_OPTIONS } from "@/lib/creator-sort-options";

const CREATOR_TYPES = ["nano", "micro", "mid", "macro", "mega"] as const;
const STATUSES = ["prospect", "approved", "active", "inactive", "do_not_work_with"] as const;
const PLATFORMS = ["instagram", "tiktok", "x", "youtube", "facebook", "other"] as const;

export function CreatorFilters({
  countries,
  categories,
  niches,
}: {
  countries: string[];
  categories: string[];
  niches: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function onSearchChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParam("q", value), 300);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative w-64">
        <Search
          size={15}
          strokeWidth={1.75}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft/50"
        />
        <input
          type="search"
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search creators..."
          className="input pl-8"
        />
      </div>

      <select
        className="input w-auto"
        defaultValue={searchParams.get("platform") ?? ""}
        onChange={(e) => updateParam("platform", e.target.value)}
      >
        <option value="">All platforms</option>
        {PLATFORMS.map((p) => (
          <option key={p} value={p}>
            {p[0].toUpperCase() + p.slice(1)}
          </option>
        ))}
      </select>

      <select
        className="input w-auto"
        defaultValue={searchParams.get("country") ?? ""}
        onChange={(e) => updateParam("country", e.target.value)}
      >
        <option value="">All countries</option>
        {countries.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        className="input w-auto"
        defaultValue={searchParams.get("category") ?? ""}
        onChange={(e) => updateParam("category", e.target.value)}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        className="input w-auto"
        defaultValue={searchParams.get("niche") ?? ""}
        onChange={(e) => updateParam("niche", e.target.value)}
      >
        <option value="">All niches</option>
        {niches.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      <select
        className="input w-auto"
        defaultValue={searchParams.get("type") ?? ""}
        onChange={(e) => updateParam("type", e.target.value)}
      >
        <option value="">All types</option>
        {CREATOR_TYPES.map((t) => (
          <option key={t} value={t}>
            {t[0].toUpperCase() + t.slice(1)}
          </option>
        ))}
      </select>

      <select
        className="input w-auto"
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(e) => updateParam("status", e.target.value)}
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      <select
        className="input w-auto"
        defaultValue={searchParams.get("sort") ?? "recently_added"}
        onChange={(e) => updateParam("sort", e.target.value)}
      >
        {Object.entries(CREATOR_SORT_OPTIONS).map(([key, { label }]) => (
          <option key={key} value={key}>
            Sort: {label}
          </option>
        ))}
      </select>
    </div>
  );
}
