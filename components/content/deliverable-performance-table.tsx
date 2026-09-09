import Link from "next/link";
import { PlatformIcon } from "@/components/platform-icon";
import type { TrackerItem } from "@/lib/execution";
import { formatMetric, formatMetricRate } from "@/lib/format";
import {
  CONTENT_TYPE_LABEL,
  DELIVERABLE_STATUS_LABEL,
  DELIVERABLE_STATUS_STYLE,
  COMPLETENESS_LABEL,
  COMPLETENESS_STYLE,
} from "@/lib/content-labels";

// Every deliverable/Story instance gets its own row — never collapsed
// into one line per creator or per campaign (spec sections 1 and 28.3).
// Shared by the campaign dashboard's Performance section and the
// campaign report so both stay identical rather than drifting apart.
export function DeliverablePerformanceTable({ items, showCreatorColumn = true }: { items: TrackerItem[]; showCreatorColumn?: boolean }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
              {showCreatorColumn && <th className="p-3">Creator</th>}
              <th className="p-3">Content</th>
              <th className="p-3">Status</th>
              <th className="p-3">Views</th>
              <th className="p-3">Engagements</th>
              <th className="p-3">Eng. rate</th>
              <th className="p-3">Completeness</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.key} className="border-b border-line last:border-0 hover:bg-paper">
                {showCreatorColumn && <td className="p-3 text-ink-soft">{item.creatorName}</td>}
                <td className="p-3">
                  <Link
                    href={`/campaigns/${item.campaignId}/content/${item.deliverableId}`}
                    className="flex items-center gap-1.5 font-medium text-ink underline"
                  >
                    <PlatformIcon platform={item.platform} size={13} />
                    {item.title || CONTENT_TYPE_LABEL[item.contentType]}
                    {item.isStory && item.sequenceNumber ? ` — Story #${item.sequenceNumber}` : ""}
                  </Link>
                </td>
                <td className="p-3">
                  <span className={`badge capitalize ${DELIVERABLE_STATUS_STYLE[item.status]}`}>
                    {DELIVERABLE_STATUS_LABEL[item.status]}
                  </span>
                </td>
                <td className="p-3 text-ink-soft">{formatMetric(item.metrics.views)}</td>
                <td className="p-3 text-ink-soft">{formatMetric(item.metrics.engagements)}</td>
                <td className="p-3 text-ink-soft">{formatMetricRate(item.metrics.engagement_rate)}</td>
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
