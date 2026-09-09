import { GitCompareArrows } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PlatformIcon } from "@/components/platform-icon";
import { DiscoveredContentActions } from "@/components/content/discovered-content-actions";
import { getAmbiguousDiscoveredContent } from "@/lib/discovered-content";
import { formatDate } from "@/lib/format";

export default async function ContentMatchesPage() {
  const rows = await getAmbiguousDiscoveredContent();

  return (
    <div>
      <PageHeader
        title="Content Matches"
        description="A discovered post with more than one plausible deliverable — confirm the right one, or ignore it. Nothing here gets assigned automatically."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={GitCompareArrows}
          title="Nothing waiting for review"
          description="Ambiguous matches found during a sync will show up here."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
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
              <p className="mb-2 text-xs text-ink-soft">{row.candidates.length} possible deliverable(s) found.</p>
              <DiscoveredContentActions
                discoveredContentId={row.id}
                options={row.candidates.map((c) => ({ deliverableId: c.deliverableId, label: c.campaignName, confidence: c.confidence }))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
