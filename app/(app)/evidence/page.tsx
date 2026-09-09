import { ImageOff } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { EvidenceReview } from "@/components/content/evidence-review";
import { getAllExecutionRows, getEvidenceReviewItems } from "@/lib/execution";

export default async function EvidenceReviewPage() {
  const rows = await getAllExecutionRows();
  const items = getEvidenceReviewItems(rows);

  return (
    <div>
      <PageHeader
        title="Evidence"
        description="Every screenshot, uploaded file, and Drive link on file for a deliverable or Story instance, across every campaign."
      />
      {items.length === 0 ? (
        <EmptyState icon={ImageOff} title="No trackable content yet" description="Evidence will show up here once deliverables exist." />
      ) : (
        <EvidenceReview items={items} />
      )}
    </div>
  );
}
