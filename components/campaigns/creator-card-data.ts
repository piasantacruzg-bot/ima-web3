import type { CampaignCreatorSelectionStatus, SocialPlatform } from "@/types/database";

// Shared shape for a creator card, regardless of whether it came from a
// live match calculation (not yet in campaign_creators) or an existing
// campaign_creators row — one card component renders both.
export interface CreatorCardData {
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
  matchScore: number | null;
  matchReasons: string[];
  eligibilityNote: string | null;
  selectionStatus: CampaignCreatorSelectionStatus | null;
  proposedFee: number | null;
  negotiatedFee: number | null;
  approvedFee: number | null;
  currency: string | null;
  notes: string | null;
}
