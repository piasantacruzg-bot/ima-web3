"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid, Table as TableIcon, Search } from "lucide-react";
import { PlatformIcon } from "@/components/platform-icon";
import type { TrackerItem } from "@/lib/execution";
import { formatDate, formatMetric, formatMetricRate } from "@/lib/format";
import {
  CONTENT_TYPE_LABEL,
  DELIVERABLE_STATUS_LABEL,
  DELIVERABLE_STATUS_STYLE,
  DELIVERABLE_STATUS_ORDER,
  COMPLETENESS_LABEL,
  COMPLETENESS_STYLE,
} from "@/lib/content-labels";
import type { DeliverableStatus, SocialPlatform } from "@/types/database";

type View = "table" | "kanban";

const PLATFORMS: SocialPlatform[] = ["instagram", "tiktok", "x", "youtube", "facebook", "other"];

export function ContentTracker({
  items,
  showCampaignColumn = false,
}: {
  items: TrackerItem[];
  showCampaignColumn?: boolean;
}) {
  const [view, setView] = useState<View>("table");
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<SocialPlatform | "">("");
  const [status, setStatus] = useState<DeliverableStatus | "">("");
  const [storiesOnly, setStoriesOnly] = useState(false);
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [missingMetrics, setMissingMetrics] = useState(false);
  const [missingEvidence, setMissingEvidence] = useState(false);
  const [missingUrl, setMissingUrl] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        const haystack = `${item.creatorName} ${item.campaignName} ${item.title ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (platform && item.platform !== platform) return false;
      if (status && item.status !== status) return false;
      if (storiesOnly && !item.isStory) return false;
      if (needsReviewOnly && !item.needsReview) return false;
      if (missingMetrics && item.hasMetrics) return false;
      if (missingEvidence && item.hasEvidence) return false;
      if (missingUrl && item.hasUrl) return false;
      return true;
    });
  }, [items, search, platform, status, storiesOnly, needsReviewOnly, missingMetrics, missingEvidence, missingUrl]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search creator, campaign, title…"
            className="input pl-8"
          />
        </div>
        <select className="input w-auto" value={platform} onChange={(e) => setPlatform(e.target.value as SocialPlatform | "")}>
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p[0].toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value as DeliverableStatus | "")}>
          <option value="">All statuses</option>
          {DELIVERABLE_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {DELIVERABLE_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-1 rounded-sm border border-line p-0.5">
          <button
            type="button"
            onClick={() => setView("table")}
            className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium transition ${
              view === "table" ? "bg-ink text-paper-raised" : "text-ink-soft hover:text-ink"
            }`}
          >
            <TableIcon size={13} strokeWidth={1.75} />
            Table
          </button>
          <button
            type="button"
            onClick={() => setView("kanban")}
            className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium transition ${
              view === "kanban" ? "bg-ink text-paper-raised" : "text-ink-soft hover:text-ink"
            }`}
          >
            <LayoutGrid size={13} strokeWidth={1.75} />
            Kanban
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-ink-soft">
        <FilterToggle checked={storiesOnly} onChange={setStoriesOnly} label="Stories only" />
        <FilterToggle checked={needsReviewOnly} onChange={setNeedsReviewOnly} label="Needs review" />
        <FilterToggle checked={missingMetrics} onChange={setMissingMetrics} label="Missing metrics" />
        <FilterToggle checked={missingEvidence} onChange={setMissingEvidence} label="Missing evidence" />
        <FilterToggle checked={missingUrl} onChange={setMissingUrl} label="Missing URL" />
        <span className="ml-auto">
          {filtered.length} of {items.length} tracked
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-ink-soft">No content matches these filters.</div>
      ) : view === "table" ? (
        <TrackerTable items={filtered} showCampaignColumn={showCampaignColumn} />
      ) : (
        <TrackerKanban items={filtered} showCampaignColumn={showCampaignColumn} />
      )}
    </div>
  );
}

function FilterToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function detailHref(item: TrackerItem): string {
  return `/campaigns/${item.campaignId}/content/${item.deliverableId}`;
}

function itemTitle(item: TrackerItem): string {
  const base = item.title || CONTENT_TYPE_LABEL[item.contentType];
  return item.isStory && item.sequenceNumber ? `${base} — Story #${item.sequenceNumber}` : base;
}

function TrackerTable({ items, showCampaignColumn }: { items: TrackerItem[]; showCampaignColumn: boolean }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
              {showCampaignColumn && <th className="p-3">Campaign</th>}
              <th className="p-3">Creator</th>
              <th className="p-3">Content</th>
              <th className="p-3">Status</th>
              <th className="p-3">Due</th>
              <th className="p-3">Views</th>
              <th className="p-3">Eng. rate</th>
              <th className="p-3">Evidence</th>
              <th className="p-3">Completeness</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.key} className="border-b border-line last:border-0 hover:bg-paper">
                {showCampaignColumn && (
                  <td className="p-3 text-ink-soft">
                    <Link href={`/campaigns/${item.campaignId}`} className="underline">
                      {item.campaignName}
                    </Link>
                  </td>
                )}
                <td className="p-3 text-ink-soft">{item.creatorName}</td>
                <td className="p-3">
                  <Link href={detailHref(item)} className="flex items-center gap-1.5 font-medium text-ink underline">
                    <PlatformIcon platform={item.platform} size={13} />
                    {itemTitle(item)}
                  </Link>
                </td>
                <td className="p-3">
                  <span className={`badge capitalize ${DELIVERABLE_STATUS_STYLE[item.status]}`}>
                    {DELIVERABLE_STATUS_LABEL[item.status]}
                  </span>
                </td>
                <td className="p-3 text-ink-soft">{formatDate(item.dueDate)}</td>
                <td className="p-3 text-ink-soft">{formatMetric(item.metrics.views)}</td>
                <td className="p-3 text-ink-soft">{formatMetricRate(item.metrics.engagement_rate)}</td>
                <td className="p-3 text-ink-soft">{item.hasEvidence ? "Yes" : "No"}</td>
                <td className="p-3">
                  <span className={`badge ${COMPLETENESS_STYLE[item.completeness]}`}>
                    {COMPLETENESS_LABEL[item.completeness]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrackerKanban({ items, showCampaignColumn }: { items: TrackerItem[]; showCampaignColumn: boolean }) {
  const byStatus = new Map<DeliverableStatus, TrackerItem[]>();
  for (const status of DELIVERABLE_STATUS_ORDER) byStatus.set(status, []);
  for (const item of items) {
    byStatus.get(item.status)?.push(item);
  }

  const nonEmptyColumns = DELIVERABLE_STATUS_ORDER.filter((s) => (byStatus.get(s)?.length ?? 0) > 0);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {nonEmptyColumns.map((status) => {
        const columnItems = byStatus.get(status) ?? [];
        return (
          <div key={status} className="w-64 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className={`badge ${DELIVERABLE_STATUS_STYLE[status]}`}>{DELIVERABLE_STATUS_LABEL[status]}</span>
              <span className="text-xs text-ink-soft">{columnItems.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {columnItems.map((item) => (
                <Link key={item.key} href={detailHref(item)} className="card block p-3 text-sm hover:border-ink/30">
                  <div className="flex items-center gap-1.5 font-medium text-ink">
                    <PlatformIcon platform={item.platform} size={13} />
                    {itemTitle(item)}
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    {item.creatorName}
                    {showCampaignColumn ? ` · ${item.campaignName}` : ""}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`badge ${COMPLETENESS_STYLE[item.completeness]}`}>
                      {COMPLETENESS_LABEL[item.completeness]}
                    </span>
                    {item.needsReview && <span className="badge border-status-warning/30 text-status-warning">Review</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
