import { notFound } from "next/navigation";
import { Link2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ContentTracker } from "@/components/content/content-tracker";
import { getCampaignExecutionRows, getTrackerItems } from "@/lib/execution";
import { getCampaignDetail } from "@/lib/campaigns";

export default async function CampaignContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getCampaignDetail(id);
  if (!detail) notFound();

  const rows = await getCampaignExecutionRows(id);
  const items = getTrackerItems(rows);

  return (
    <div>
      <PageHeader
        title={`${detail.campaign.campaign_name} — Content`}
        description={`${items.length} independently-trackable content item${items.length === 1 ? "" : "s"}`}
        actions={
          <>
            <a href={`/api/campaigns/${id}/content/export?format=csv`} className="btn-secondary">
              Export (CSV)
            </a>
            <a href={`/api/campaigns/${id}/content/export?format=xlsx`} className="btn-secondary">
              Export (XLSX)
            </a>
          </>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No content tracked yet"
          description="Select creators for this campaign to auto-assign deliverables, then track each one here."
        />
      ) : (
        <ContentTracker items={items} />
      )}
    </div>
  );
}
