import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Campaign summaries, platform and creator performance, top content, and generated insights."
      />
      <EmptyState
        icon={BarChart3}
        title="Reporting engine lands in Phase 9"
        description="Reports are generated from real campaign, deliverable, and metrics data once campaigns and content tracking are built — never fabricated."
      />
    </div>
  );
}
