import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CampaignWizard } from "@/components/campaigns/campaign-wizard";
import { createClient } from "@/lib/supabase/server";

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: campaign }, { data: templates }, { data: owners }] = await Promise.all([
    supabase.from("campaigns").select("*").eq("id", id).maybeSingle(),
    supabase.from("campaign_deliverable_templates").select("*").eq("campaign_id", id),
    supabase.from("profiles").select("id, full_name, email").order("full_name"),
  ]);

  if (!campaign) notFound();

  return (
    <div>
      <PageHeader title={`Edit: ${campaign.campaign_name}`} description="Changes save as you move through each step." />
      <CampaignWizard
        owners={owners ?? []}
        initialCampaign={campaign}
        initialTemplates={(templates ?? []).map((t) => ({
          id: t.id,
          platform: t.platform,
          content_type: t.content_type,
          quantity: t.quantity,
          default_due_date: t.default_due_date ?? "",
          instructions: t.instructions ?? "",
          usage_rights: t.usage_rights ?? "",
          paid_media_rights: t.paid_media_rights,
          exclusivity_requirements: t.exclusivity_requirements ?? "",
          approval_required: t.approval_required,
          notes: t.notes ?? "",
        }))}
      />
    </div>
  );
}
