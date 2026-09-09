"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { campaignSchema, deliverableTemplateSchema } from "@/lib/validation/campaign";
import { getCandidateCreators, getCreatorHistoryMap, creatorToMatchingInput } from "@/lib/campaigns";
import { creatorMatchingService, type Eligibility, type MatchBreakdown } from "@/lib/campaigns/matching-service";
import { syncCampaignContent } from "@/lib/sync";
import type {
  Campaign,
  CampaignCreatorSelectionStatus,
  CampaignCreatorStatus,
  SocialPlatform,
} from "@/types/database";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// --- Recommendations -----------------------------------------------------

export interface RecommendedCreator {
  creatorId: string;
  displayName: string;
  city: string | null;
  country: string | null;
  categories: string[];
  platforms: SocialPlatform[];
  followers: number | null;
  engagementRate: number | null;
  averageViews: number | null;
  brandFitScore: number | null;
  internalRating: number | null;
  previousCampaignCount: number;
  matchScore: number;
  eligibility: Eligibility;
  breakdown: MatchBreakdown;
  hardRequirementFailures: string[];
  strengths: string[];
  concerns: string[];
}

// Reads a campaign's saved requirements and runs the deterministic
// matching engine against the candidate creator pool (spec section 41:
// hard-filter first, score only what's left). Shared by the wizard's
// "Creator Selection" step and the standalone /campaigns/[id]/creators
// workspace — one recommendation pipeline, not two.
export async function getRecommendedCreators(campaignId: string): Promise<RecommendedCreator[]> {
  const supabase = await createClient();
  const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (!campaign) return [];

  const requirements = campaign.creator_requirements ?? {};
  const candidates = await getCandidateCreators({
    platforms: campaign.target_platforms.length > 0 ? campaign.target_platforms : undefined,
    categories:
      campaign.target_categories.length > 0
        ? campaign.target_categories
        : requirements.categories && requirements.categories.length > 0
          ? requirements.categories
          : undefined,
    locations: requirements.locations,
    allowedStatuses: requirements.allowed_statuses,
    excludedCreatorIds: campaign.excluded_creator_ids,
    excludedCategories: campaign.excluded_categories,
    excludedLocations: campaign.excluded_locations,
  });

  const { data: alreadyLinked } = await supabase
    .from("campaign_creators")
    .select("creator_id")
    .eq("campaign_id", campaignId);
  const linkedIds = new Set((alreadyLinked ?? []).map((r) => r.creator_id));

  const eligible = candidates.filter((c) => !linkedIds.has(c.creator.id));
  const historyMap = await getCreatorHistoryMap(eligible.map((c) => c.creator.id));

  const results: RecommendedCreator[] = eligible.map(({ creator, stats }) => {
    const match = creatorMatchingService(
      { ...requirements, platforms: campaign.target_platforms },
      creatorToMatchingInput(creator, stats),
      historyMap.get(creator.id) ?? null,
      campaign.matching_weights
    );
    return {
      creatorId: creator.id,
      displayName: creator.display_name,
      city: creator.city,
      country: creator.country,
      categories: creator.categories,
      platforms: stats.platforms,
      followers: stats.followers,
      engagementRate: stats.engagementRate,
      averageViews: stats.averageViews,
      brandFitScore: creator.brand_fit_score,
      internalRating: creator.internal_rating,
      previousCampaignCount: historyMap.get(creator.id)?.previousCampaignCount ?? 0,
      matchScore: match.score,
      eligibility: match.eligibility,
      breakdown: match.breakdown,
      hardRequirementFailures: match.hardRequirementFailures,
      strengths: match.strengths,
      concerns: match.concerns,
    };
  });

  return results
    .filter((r) => r.eligibility !== "ineligible")
    .sort((a, b) => b.matchScore - a.matchScore);
}

// --- Campaigns --------------------------------------------------------

export interface SaveCampaignInput {
  id?: string;
  [key: string]: unknown;
}

export async function saveCampaign(
  input: SaveCampaignInput
): Promise<{ campaignId: string } | { error: string }> {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid campaign data." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const row = { ...parsed.data, updated_at: new Date().toISOString() };

  if (input.id) {
    const { data: existing } = await supabase.from("campaigns").select("*").eq("id", input.id).maybeSingle();
    if (!existing) return { error: "Campaign not found." };

    const { data: updated, error } = await supabase
      .from("campaigns")
      .update(row)
      .eq("id", input.id)
      .select()
      .single();
    if (error || !updated) return { error: "Could not save the campaign." };

    await logAudit(supabase, "campaign_updated", "campaigns", updated.id, existing as unknown as Record<string, unknown>, row);
    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${updated.id}`);
    return { campaignId: updated.id };
  }

  const { data: created, error } = await supabase
    .from("campaigns")
    .insert({ ...row, created_by: userData.user?.id ?? null })
    .select()
    .single();
  if (error || !created) return { error: "Could not create the campaign." };

  await logAudit(supabase, "campaign_created", "campaigns", created.id, null, row);
  revalidatePath("/campaigns");
  return { campaignId: created.id };
}

export async function archiveCampaign(campaignId: string) {
  const supabase = await createClient();
  await supabase.from("campaigns").update({ archived_at: new Date().toISOString() }).eq("id", campaignId);
  await logAudit(supabase, "campaign_archived", "campaigns", campaignId, null, {});
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function restoreCampaign(campaignId: string) {
  const supabase = await createClient();
  await supabase.from("campaigns").update({ archived_at: null }).eq("id", campaignId);
  await logAudit(supabase, "campaign_restored", "campaigns", campaignId, null, {});
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
}

// Copies campaign structure/objectives/requirements/deliverable templates/
// budget/matching weights. Selected creators are copied only when
// explicitly requested (spec section 32) — never by default, to avoid
// accidentally reusing a roster from an unrelated campaign.
export async function duplicateCampaign(
  campaignId: string,
  options: { duplicateCreators: boolean }
): Promise<{ campaignId: string } | { error: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: source } = await supabase.from("campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (!source) return { error: "Campaign not found." };

  const {
    id: _id,
    created_at: _createdAt,
    updated_at: _updatedAt,
    is_demo: _isDemo,
    archived_at: _archivedAt,
    ...rest
  } = source as Campaign;
  void _id;
  void _createdAt;
  void _updatedAt;
  void _isDemo;
  void _archivedAt;

  const { data: created, error } = await supabase
    .from("campaigns")
    .insert({
      ...rest,
      campaign_name: `${source.campaign_name} (Copy)`,
      status: "draft",
      created_by: userData.user?.id ?? null,
    })
    .select()
    .single();
  if (error || !created) return { error: "Could not duplicate the campaign." };

  const { data: templates } = await supabase
    .from("campaign_deliverable_templates")
    .select("*")
    .eq("campaign_id", campaignId);
  if (templates && templates.length > 0) {
    await supabase.from("campaign_deliverable_templates").insert(
      templates.map(({ id: _tid, created_at: _tcreated, ...t }) => {
        void _tid;
        void _tcreated;
        return { ...t, campaign_id: created.id };
      })
    );
  }

  if (options.duplicateCreators) {
    const { data: creators } = await supabase.from("campaign_creators").select("*").eq("campaign_id", campaignId);
    if (creators && creators.length > 0) {
      await supabase.from("campaign_creators").insert(
        creators.map((c) => ({
          campaign_id: created.id,
          creator_id: c.creator_id,
          status: "suggested" as CampaignCreatorStatus,
          selection_status: null,
          payment_status: "unpaid",
          contract_status: "not_sent",
          briefing_status: "not_sent",
          // Match data is relative to the source campaign's requirements —
          // cleared so the new campaign gets a fresh match calculation.
          match_score: null,
          match_reasons: [],
          match_breakdown: {},
          added_by: userData.user?.id ?? null,
        }))
      );
    }
  }

  await logAudit(supabase, "campaign_duplicated", "campaigns", created.id, null, { source_campaign_id: campaignId });
  revalidatePath("/campaigns");
  return { campaignId: created.id };
}

// --- Campaign creators --------------------------------------------------

async function getCampaignCreatorRow(supabase: Supabase, campaignId: string, creatorId: string) {
  const { data } = await supabase
    .from("campaign_creators")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("creator_id", creatorId)
    .maybeSingle();
  return data;
}

// Creates or refreshes the campaign_creators relationship — always
// references the existing creator, never touches or duplicates the
// creators table itself (spec section 11/26).
export async function addCreatorToCampaign(
  campaignId: string,
  creatorId: string,
  match?: { score: number; breakdown: Record<string, number>; reasons: string[] }
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const existing = await getCampaignCreatorRow(supabase, campaignId, creatorId);

  if (existing) {
    await supabase
      .from("campaign_creators")
      .update({
        match_score: match?.score ?? existing.match_score,
        match_breakdown: match?.breakdown ?? existing.match_breakdown,
        match_reasons: match?.reasons ?? existing.match_reasons,
        removed_at: null,
        status: existing.status === "removed" ? "suggested" : existing.status,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("campaign_creators").insert({
      campaign_id: campaignId,
      creator_id: creatorId,
      status: "suggested",
      match_score: match?.score ?? null,
      match_breakdown: match?.breakdown ?? {},
      match_reasons: match?.reasons ?? [],
      added_by: userData.user?.id ?? null,
    });
  }

  revalidatePath(`/campaigns/${campaignId}/creators`);
}

type MatchInfo = { score: number; breakdown: Record<string, number>; reasons: string[] };

export async function shortlistCampaignCreator(campaignId: string, creatorId: string, match?: MatchInfo) {
  const supabase = await createClient();
  await addCreatorToCampaign(campaignId, creatorId, match);
  await supabase
    .from("campaign_creators")
    .update({ selection_status: "shortlisted" as CampaignCreatorSelectionStatus, status: "shortlisted" })
    .eq("campaign_id", campaignId)
    .eq("creator_id", creatorId);
  revalidatePath(`/campaigns/${campaignId}/creators`);
}

// Generates this creator's deliverables from the campaign's deliverable
// templates (spec section 28) — one deliverable per template, skipping any
// template already assigned to this creator so re-selecting is a no-op
// rather than creating duplicates.
async function assignDeliverablesFromTemplates(supabase: Supabase, campaignId: string, creatorId: string) {
  const [{ data: templates }, { data: existingDeliverables }, { data: campaignCreator }] = await Promise.all([
    supabase.from("campaign_deliverable_templates").select("*").eq("campaign_id", campaignId),
    supabase.from("deliverables").select("template_id").eq("campaign_id", campaignId).eq("creator_id", creatorId),
    supabase.from("campaign_creators").select("id").eq("campaign_id", campaignId).eq("creator_id", creatorId).maybeSingle(),
  ]);

  const alreadyAssigned = new Set((existingDeliverables ?? []).map((d) => d.template_id).filter(Boolean));
  const toCreate = (templates ?? []).filter((t) => !alreadyAssigned.has(t.id));
  if (toCreate.length === 0) return;

  const { data: created } = await supabase
    .from("deliverables")
    .insert(
      toCreate.map((t) => ({
        campaign_id: campaignId,
        creator_id: creatorId,
        campaign_creator_id: campaignCreator?.id ?? null,
        template_id: t.id,
        platform: t.platform,
        content_type: t.content_type,
        quantity: t.quantity,
        due_date: t.default_due_date,
        instructions: t.instructions,
        usage_rights: t.usage_rights,
        paid_media_rights: t.paid_media_rights,
        exclusivity: t.exclusivity_requirements,
        approval_required: t.approval_required,
        notes: t.notes,
      }))
    )
    .select("id, content_type, quantity");

  // A Story deliverable with quantity > 1 becomes that many independently
  // trackable story_instances up front — never one shared record (spec
  // sections 6-7).
  const storyInstanceRows = (created ?? [])
    .filter((d) => d.content_type === "instagram_story")
    .flatMap((d) =>
      Array.from({ length: d.quantity }, (_, i) => ({ deliverable_id: d.id, sequence_number: i + 1 }))
    );
  if (storyInstanceRows.length > 0) {
    await supabase.from("story_instances").insert(storyInstanceRows);
  }
}

export async function selectCampaignCreator(campaignId: string, creatorId: string, match?: MatchInfo) {
  const supabase = await createClient();
  await addCreatorToCampaign(campaignId, creatorId, match);
  await supabase
    .from("campaign_creators")
    .update({
      selection_status: "selected" as CampaignCreatorSelectionStatus,
      selected_at: new Date().toISOString(),
    })
    .eq("campaign_id", campaignId)
    .eq("creator_id", creatorId);

  await assignDeliverablesFromTemplates(supabase, campaignId, creatorId);
  await logAudit(supabase, "campaign_creator_selected", "campaign_creators", creatorId, null, { campaign_id: campaignId });

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/creators`);
}

export async function rejectCampaignCreator(campaignId: string, creatorId: string, match?: MatchInfo) {
  const supabase = await createClient();
  await addCreatorToCampaign(campaignId, creatorId, match);
  await supabase
    .from("campaign_creators")
    .update({ selection_status: "rejected" as CampaignCreatorSelectionStatus })
    .eq("campaign_id", campaignId)
    .eq("creator_id", creatorId);
  revalidatePath(`/campaigns/${campaignId}/creators`);
}

// Removes the campaign relationship only — never the creator, never their
// deliverables' historical record (spec section 26: "None of these should
// delete the creator from the master database").
export async function removeCampaignCreator(campaignId: string, creatorId: string) {
  const supabase = await createClient();
  await supabase
    .from("campaign_creators")
    .update({
      status: "removed" as CampaignCreatorStatus,
      selection_status: null,
      removed_at: new Date().toISOString(),
    })
    .eq("campaign_id", campaignId)
    .eq("creator_id", creatorId);
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/creators`);
}

export async function updateCampaignCreatorStatus(
  campaignId: string,
  creatorId: string,
  status: CampaignCreatorStatus
) {
  const supabase = await createClient();
  await supabase
    .from("campaign_creators")
    .update({ status })
    .eq("campaign_id", campaignId)
    .eq("creator_id", creatorId);
  revalidatePath(`/campaigns/${campaignId}/creators`);
}

export async function updateCampaignCreatorFee(
  campaignId: string,
  creatorId: string,
  fee: {
    proposedFee?: number | null;
    negotiatedFee?: number | null;
    approvedFee?: number | null;
    currency?: string | null;
    feeType?: string | null;
  }
) {
  const supabase = await createClient();
  await supabase
    .from("campaign_creators")
    .update({
      proposed_fee: fee.proposedFee,
      negotiated_fee: fee.negotiatedFee,
      approved_fee: fee.approvedFee,
      currency: fee.currency,
      fee_type: fee.feeType,
    })
    .eq("campaign_id", campaignId)
    .eq("creator_id", creatorId);
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/creators`);
}

export async function updateCampaignCreatorNotes(campaignId: string, creatorId: string, notes: string) {
  const supabase = await createClient();
  await supabase
    .from("campaign_creators")
    .update({ notes })
    .eq("campaign_id", campaignId)
    .eq("creator_id", creatorId);
  revalidatePath(`/campaigns/${campaignId}/creators/${creatorId}`);
}

// --- Deliverable templates ----------------------------------------------

export async function addDeliverableTemplate(
  campaignId: string,
  input: unknown
): Promise<{ error: string } | Record<string, never>> {
  const parsed = deliverableTemplateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid deliverable." };

  const supabase = await createClient();
  await supabase.from("campaign_deliverable_templates").insert({ campaign_id: campaignId, ...parsed.data });
  revalidatePath(`/campaigns/${campaignId}`);
  return {};
}

export async function removeDeliverableTemplate(templateId: string, campaignId: string) {
  const supabase = await createClient();
  await supabase.from("campaign_deliverable_templates").delete().eq("id", templateId);
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function createCampaignAndRedirect(input: SaveCampaignInput) {
  const result = await saveCampaign(input);
  if ("error" in result) return result;
  redirect(`/campaigns/${result.campaignId}`);
}

export async function syncCampaignNow(campaignId: string) {
  const outcomes = await syncCampaignContent(campaignId);
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/content`);
  return outcomes;
}
