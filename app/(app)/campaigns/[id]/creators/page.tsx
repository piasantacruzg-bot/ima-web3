import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CreatorSelectionWorkspace } from "@/components/campaigns/creator-selection-workspace";
import type { CreatorCardData } from "@/components/campaigns/creator-card-data";
import { getCampaignCreatorRows, getCreatorHistoryMap } from "@/lib/campaigns";
import { getRecommendedCreators } from "@/app/(app)/campaigns/actions";
import { createClient } from "@/lib/supabase/server";

export default async function CampaignCreatorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: campaign } = await supabase.from("campaigns").select("campaign_name").eq("id", id).maybeSingle();
  if (!campaign) notFound();

  const [recommended, existingRows] = await Promise.all([getRecommendedCreators(id), getCampaignCreatorRows(id)]);

  const activeRows = existingRows.filter((r) => !r.campaignCreator.removed_at);
  const historyMap = await getCreatorHistoryMap(activeRows.map((r) => r.creator.id));

  const recommendedCards: CreatorCardData[] = recommended.map((r) => ({
    creatorId: r.creatorId,
    displayName: r.displayName,
    city: r.city,
    country: r.country,
    categories: r.categories,
    platforms: r.platforms,
    followers: r.followers,
    engagementRate: r.engagementRate,
    averageViews: r.averageViews,
    brandFitScore: r.brandFitScore,
    internalRating: r.internalRating,
    previousCampaignCount: r.previousCampaignCount,
    matchScore: r.matchScore,
    matchReasons: [...r.strengths, ...r.concerns],
    eligibilityNote: r.eligibility === "partial" ? r.hardRequirementFailures[0] ?? null : null,
    selectionStatus: null,
    proposedFee: null,
    negotiatedFee: null,
    approvedFee: null,
    currency: null,
    notes: null,
  }));

  const existingCards: CreatorCardData[] = activeRows.map((row) => ({
    creatorId: row.creator.id,
    displayName: row.creator.display_name,
    city: row.creator.city,
    country: row.creator.country,
    categories: row.creator.categories,
    platforms: row.stats.platforms,
    followers: row.stats.followers,
    engagementRate: row.stats.engagementRate,
    averageViews: row.stats.averageViews,
    brandFitScore: row.creator.brand_fit_score,
    internalRating: row.creator.internal_rating,
    previousCampaignCount: historyMap.get(row.creator.id)?.previousCampaignCount ?? 0,
    matchScore: row.campaignCreator.match_score,
    matchReasons: row.campaignCreator.match_reasons,
    eligibilityNote: null,
    selectionStatus: row.campaignCreator.selection_status,
    proposedFee: row.campaignCreator.proposed_fee,
    negotiatedFee: row.campaignCreator.negotiated_fee,
    approvedFee: row.campaignCreator.approved_fee,
    currency: row.campaignCreator.currency,
    notes: row.campaignCreator.notes,
  }));

  const shortlisted = existingCards.filter((c) => c.selectionStatus === "shortlisted");
  const selected = existingCards.filter((c) => c.selectionStatus === "selected");
  const rejected = existingCards.filter((c) => c.selectionStatus === "rejected");
  // Rows added but not yet decided (selection_status still null) show
  // alongside the live recommendations — nothing about them is lost.
  const undecided = existingCards.filter((c) => c.selectionStatus === null);

  return (
    <div>
      <PageHeader
        title={`${campaign.campaign_name} — Creators`}
        description="Recommended matches, shortlist, and selected creators for this campaign."
        actions={
          <>
            <a href={`/api/campaigns/${id}/creators/export?format=csv`} className="btn-secondary">
              Export shortlist (CSV)
            </a>
            <a href={`/api/campaigns/${id}/creators/export?format=xlsx`} className="btn-secondary">
              Export shortlist (XLSX)
            </a>
          </>
        }
      />
      <CreatorSelectionWorkspace
        campaignId={id}
        recommended={[...undecided, ...recommendedCards]}
        shortlisted={shortlisted}
        selected={selected}
        rejected={rejected}
      />
    </div>
  );
}
