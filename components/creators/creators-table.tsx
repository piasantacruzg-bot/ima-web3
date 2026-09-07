import Link from "next/link";
import { User, Pencil } from "lucide-react";
import type { CreatorWithStats } from "@/types/database";
import { formatCompactNumber, formatPercent, formatDate } from "@/lib/format";

const STATUS_STYLES: Record<string, string> = {
  prospect: "border-line text-ink-soft",
  approved: "border-status-info/30 text-status-info",
  active: "border-status-success/30 text-status-success",
  inactive: "border-line text-ink-soft",
  do_not_work_with: "border-status-danger/30 text-status-danger",
};

export interface CreatorRowWithAvatar extends CreatorWithStats {
  avatarUrl: string | null;
}

export function CreatorsTable({
  creators,
  selectedIds,
  onToggle,
  onToggleAll,
}: {
  creators: CreatorRowWithAvatar[];
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: (checked: boolean) => void;
}) {
  const selectable = Boolean(selectedIds && onToggle);
  const allSelected = selectable && creators.length > 0 && creators.every((c) => selectedIds!.has(c.id));

  return (
    <>
      {/* Desktop table */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
              {selectable ? (
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onToggleAll?.(e.target.checked)}
                  />
                </th>
              ) : null}
              <th className="px-4 py-3 font-medium">Creator</th>
              <th className="px-4 py-3 font-medium">Primary platform</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Categories</th>
              <th className="px-4 py-3 text-right font-medium">Followers</th>
              <th className="px-4 py-3 text-right font-medium">Engagement</th>
              <th className="px-4 py-3 text-right font-medium">Avg. views</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">Brand fit</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {creators.map((creator) => (
              <tr key={creator.id} className="hover:bg-line-soft/40">
                {selectable ? (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds!.has(creator.id)}
                      onChange={() => onToggle!(creator.id)}
                    />
                  </td>
                ) : null}
                <td className="px-4 py-3">
                  <Link href={`/creators/${creator.id}`} className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-line-soft">
                      {creator.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={creator.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User size={14} strokeWidth={1.5} className="text-ink-soft" />
                      )}
                    </span>
                    <span>
                      <span className="block font-medium text-ink hover:underline">
                        {creator.display_name}
                      </span>
                      {creator.primary_username ? (
                        <span className="block text-xs text-ink-soft">@{creator.primary_username}</span>
                      ) : null}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 capitalize text-ink-soft">{creator.primary_platform ?? "—"}</td>
                <td className="px-4 py-3 text-ink-soft">
                  {[creator.city, creator.country].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-ink-soft">{creator.categories.join(", ") || "—"}</td>
                <td className="px-4 py-3 text-right text-ink">
                  {formatCompactNumber(creator.max_followers)}
                </td>
                <td className="px-4 py-3 text-right text-ink">
                  {formatPercent(creator.avg_engagement_rate)}
                </td>
                <td className="px-4 py-3 text-right text-ink">
                  {formatCompactNumber(creator.max_average_views)}
                </td>
                <td className="px-4 py-3 capitalize text-ink-soft">{creator.creator_type ?? "—"}</td>
                <td className="px-4 py-3 text-right text-ink-soft">
                  {creator.brand_fit_score ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`badge capitalize ${STATUS_STYLES[creator.status] ?? "border-line text-ink-soft"}`}
                  >
                    {creator.status.replace(/_/g, " ")}
                  </span>
                  {creator.archived_at ? (
                    <span className="badge ml-1 border-line text-ink-soft">Archived</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-xs text-ink-soft">{formatDate(creator.updated_at)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/creators/${creator.id}/edit`}
                    className="text-ink-soft hover:text-ink"
                    aria-label="Edit"
                  >
                    <Pencil size={14} strokeWidth={1.75} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {creators.map((creator) => (
          <div key={creator.id} className="card relative p-4">
            {selectable ? (
              <input
                type="checkbox"
                checked={selectedIds!.has(creator.id)}
                onChange={() => onToggle!(creator.id)}
                className="absolute right-4 top-4"
              />
            ) : null}
            <Link href={`/creators/${creator.id}`} className="block">
              <div className="mb-2 flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-line-soft">
                  {creator.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={creator.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User size={16} strokeWidth={1.5} className="text-ink-soft" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{creator.display_name}</p>
                  {creator.primary_username ? (
                    <p className="truncate text-xs text-ink-soft">@{creator.primary_username}</p>
                  ) : null}
                </div>
                <span
                  className={`badge ml-auto shrink-0 capitalize ${STATUS_STYLES[creator.status] ?? "border-line text-ink-soft"}`}
                >
                  {creator.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-ink-soft">
                <div>
                  <p>Followers</p>
                  <p className="text-ink">{formatCompactNumber(creator.max_followers)}</p>
                </div>
                <div>
                  <p>Engagement</p>
                  <p className="text-ink">{formatPercent(creator.avg_engagement_rate)}</p>
                </div>
                <div>
                  <p>Location</p>
                  <p className="text-ink">{creator.city || creator.country || "—"}</p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
