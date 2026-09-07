import { Megaphone } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { count } = await supabase.from("campaigns").select("*", { count: "exact", head: true });

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Proposals, creator selection, deliverables, and per-campaign dashboards."
      />
      <EmptyState
        icon={Megaphone}
        title={count ? `${count} campaigns in the database` : "No campaigns yet"}
        description="The New Campaign wizard, creator matching, and campaign dashboards land in Phase 4. The schema and demo campaigns are already in place."
      />
    </div>
  );
}
