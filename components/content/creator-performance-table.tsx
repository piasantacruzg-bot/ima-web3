import Link from "next/link";
import { formatMetric, formatMetricRate } from "@/lib/format";
import type { CreatorPerformanceRow } from "@/lib/execution";

// A creator's totals here are always the sum of their own deliverables'
// metrics (via lib/execution's getCreatorCampaignMetrics) — never a
// separately entered figure (spec sections 1 and 24).
export function CreatorPerformanceTable({ rows }: { rows: CreatorPerformanceRow[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="p-3">Creator</th>
              <th className="p-3">Deliverables</th>
              <th className="p-3">Views</th>
              <th className="p-3">Reach</th>
              <th className="p-3">Engagements</th>
              <th className="p-3">Eng. rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.creatorId} className="border-b border-line last:border-0 hover:bg-paper">
                <td className="p-3">
                  <Link href={`/creators/${r.creatorId}`} className="font-medium text-ink underline">
                    {r.creatorName}
                  </Link>
                </td>
                <td className="p-3 text-ink-soft">{r.deliverableCount}</td>
                <td className="p-3 text-ink-soft">{formatMetric(r.metrics.views)}</td>
                <td className="p-3 text-ink-soft">{formatMetric(r.metrics.reach)}</td>
                <td className="p-3 text-ink-soft">{formatMetric(r.metrics.engagements)}</td>
                <td className="p-3 text-ink-soft">{formatMetricRate(r.metrics.engagement_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
