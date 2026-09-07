import { PageHeader } from "@/components/ui/page-header";
import { CampaignWizard } from "@/components/campaigns/campaign-wizard";
import { createClient } from "@/lib/supabase/server";

export default async function NewCampaignPage() {
  const supabase = await createClient();
  const { data: owners } = await supabase.from("profiles").select("id, full_name, email").order("full_name");

  return (
    <div>
      <PageHeader
        title="New campaign"
        description="Basics, objectives, audience, creator requirements, deliverables, budget, and creator selection — save as a draft at any point."
      />
      <CampaignWizard owners={owners ?? []} />
    </div>
  );
}
