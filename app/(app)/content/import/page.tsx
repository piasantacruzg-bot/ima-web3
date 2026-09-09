import { Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PlatformIcon } from "@/components/platform-icon";
import { DiscoveredContentActions } from "@/components/content/discovered-content-actions";
import { getUnmatchedDiscoveredContent, getOpenDeliverableOptions } from "@/lib/discovered-content";
import { formatDate } from "@/lib/format";

export default async function ContentImportPage() {
  const rows = await getUnmatchedDiscoveredContent();
  const rowsWithOptions = await Promise.all(
    rows.map(async (row) => ({ row, options: await getOpenDeliverableOptions(row.creator_id, row.platform) }))
  );

  return (
    <div>
      <PageHeader
        title="Import Content"
        description="Discovered posts the matcher couldn't link to any deliverable on its own — assign each one to a campaign/creator/deliverable by hand, or ignore it."
      />

      {rowsWithOptions.length === 0 ? (
        <EmptyState
          icon={Upload}
          title="Nothing to import"
          description="Unmatched posts found during a sync will show up here for manual assignment."
        />
      ) : (
        <div className="space-y-3">
          {rowsWithOptions.map(({ row, options }) => (
            <div key={row.id} className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <PlatformIcon platform={row.platform} size={14} />
                  <span className="font-medium text-ink">{row.creatorName}</span>
                  <a href={row.post_url} target="_blank" rel="noreferrer" className="text-ink-soft underline">
                    view post
                  </a>
                </div>
                <span className="text-xs text-ink-soft">Published {formatDate(row.published_at)}</span>
              </div>
              <p className="mb-2 text-xs text-ink-soft">Unable to match — assign to an open deliverable for this creator.</p>
              <DiscoveredContentActions discoveredContentId={row.id} options={options} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
