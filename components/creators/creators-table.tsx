import Link from "next/link";
import type { CreatorWithStats } from "@/types/database";
import { formatCompactNumber, formatPercent } from "@/lib/format";

const STATUS_STYLES: Record<string, string> = {
  prospect: "border-line text-ink-soft",
  approved: "border-status-info/30 text-status-info",
  active: "border-status-success/30 text-status-success",
  inactive: "border-line text-ink-soft",
  do_not_work_with: "border-status-danger/30 text-status-danger",
};

export function CreatorsTable({ creators }: { creators: CreatorWithStats[] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
            <th className="px-4 py-3 font-medium">Creator</th>
            <th className="px-4 py-3 font-medium">Location</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Platforms</th>
            <th className="px-4 py-3 text-right font-medium">Followers</th>
            <th className="px-4 py-3 text-right font-medium">Engagement</th>
            <th className="px-4 py-3 text-right font-medium">Campaigns</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {creators.map((creator) => (
            <tr key={creator.id} className="hover:bg-line-soft/40">
              <td className="px-4 py-3">
                <Link
                  href={`/creators/${creator.id}`}
                  className="font-medium text-ink hover:underline"
                >
                  {creator.display_name}
                </Link>
                {creator.categories.length > 0 ? (
                  <p className="text-xs text-ink-soft">{creator.categories.join(", ")}</p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-ink-soft">
                {[creator.city, creator.country].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="px-4 py-3 capitalize text-ink-soft">{creator.creator_type ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {(creator.platforms ?? []).map((p) => (
                    <span key={p} className="badge border-line capitalize text-ink-soft">
                      {p}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-right text-ink">
                {formatCompactNumber(creator.max_followers)}
              </td>
              <td className="px-4 py-3 text-right text-ink">
                {formatPercent(creator.avg_engagement_rate)}
              </td>
              <td className="px-4 py-3 text-right text-ink-soft">{creator.campaign_count}</td>
              <td className="px-4 py-3">
                <span
                  className={`badge capitalize ${STATUS_STYLES[creator.status] ?? "border-line text-ink-soft"}`}
                >
                  {creator.status.replace(/_/g, " ")}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
