import { Link2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ContentTracker } from "@/components/content/content-tracker";
import { getAllExecutionRows, getTrackerItems } from "@/lib/execution";

export default async function ContentTrackerPage() {
  const rows = await getAllExecutionRows();
  const items = getTrackerItems(rows);

  return (
    <div>
      <PageHeader
        title="Content Tracker"
        description={`${items.length} independently-trackable content item${items.length === 1 ? "" : "s"} across every campaign`}
        actions={
          <>
            <a href="/api/content/export?format=csv" className="btn-secondary">
              Export (CSV)
            </a>
            <a href="/api/content/export?format=xlsx" className="btn-secondary">
              Export (XLSX)
            </a>
          </>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No content tracked yet"
          description="Deliverables appear here once creators are selected on a campaign — each Story instance, post, and video is tracked on its own."
        />
      ) : (
        <ContentTracker items={items} showCampaignColumn />
      )}
    </div>
  );
}
