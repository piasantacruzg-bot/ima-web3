"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EvidenceReviewItem } from "@/lib/execution";
import { CONTENT_TYPE_LABEL } from "@/lib/content-labels";

type StorageFilter = "" | "missing" | "uploaded" | "drive" | "internal";

export function EvidenceReview({ items }: { items: EvidenceReviewItem[] }) {
  const [search, setSearch] = useState("");
  const [storageFilter, setStorageFilter] = useState<StorageFilter>("");
  const [storiesOnly, setStoriesOnly] = useState(false);

  const campaigns = useMemo(() => [...new Set(items.map((i) => i.campaignName))].sort(), [items]);
  const [campaignFilter, setCampaignFilter] = useState("");

  const filtered = items.filter((item) => {
    if (search && !`${item.creatorName} ${item.campaignName}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (campaignFilter && item.campaignName !== campaignFilter) return false;
    if (storiesOnly && !item.isStory) return false;
    if (storageFilter === "missing" && item.hasEvidence) return false;
    if (storageFilter === "uploaded" && !item.hasEvidence) return false;
    if (storageFilter === "drive" && !item.hasDriveEvidence) return false;
    if (storageFilter === "internal" && !item.hasInternalEvidence) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search creator, campaign…"
          className="input min-w-[200px] flex-1"
        />
        <select className="input w-auto" value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)}>
          <option value="">All campaigns</option>
          {campaigns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={storageFilter} onChange={(e) => setStorageFilter(e.target.value as StorageFilter)}>
          <option value="">All evidence</option>
          <option value="missing">Missing evidence</option>
          <option value="uploaded">Uploaded</option>
          <option value="drive">Google Drive</option>
          <option value="internal">Internal storage</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-ink-soft">
          <input type="checkbox" checked={storiesOnly} onChange={(e) => setStoriesOnly(e.target.checked)} />
          Stories only
        </label>
        <span className="ml-auto text-xs text-ink-soft">
          {filtered.length} of {items.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <Link
            key={item.key}
            href={`/campaigns/${item.campaignId}/content/${item.deliverableId}`}
            className="card block overflow-hidden p-3 hover:border-ink/30"
          >
            <div className="mb-2 flex h-28 items-center justify-center overflow-hidden rounded-sm bg-line-soft">
              {item.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- external evidence thumbnail, not an optimizable remote image
                <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-ink-soft">{item.hasEvidence ? "No preview" : "No evidence"}</span>
              )}
            </div>
            <p className="truncate text-sm font-medium text-ink">
              {item.title || CONTENT_TYPE_LABEL[item.contentType]}
              {item.isStory && item.sequenceNumber ? ` — Story #${item.sequenceNumber}` : ""}
            </p>
            <p className="truncate text-xs text-ink-soft">
              {item.creatorName} · {item.campaignName}
            </p>
            <div className="mt-2 flex gap-1.5">
              {item.hasDriveEvidence ? <span className="badge border-line text-ink-soft">Drive</span> : null}
              {item.hasInternalEvidence ? <span className="badge border-line text-ink-soft">Internal</span> : null}
              {!item.hasEvidence ? <span className="badge border-status-danger/30 text-status-danger">Missing</span> : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
