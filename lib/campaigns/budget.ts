// Budget math for a campaign (spec sections 24-25). Pure logic — the
// caller supplies the campaign's budget fields and every campaign_creator
// fee row, and gets back the numbers + warnings the dashboard renders.
// Never converts currencies automatically (spec: "Do not automatically
// convert currencies unless a reliable exchange-rate integration is
// implemented later") — a currency mismatch is surfaced as a warning, not
// silently summed together.

import type { CampaignCreatorSelectionStatus } from "@/types/database";

export interface CampaignCreatorFeeInput {
  creatorId: string;
  selectionStatus: CampaignCreatorSelectionStatus | null;
  proposedFee: number | null;
  negotiatedFee: number | null;
  approvedFee: number | null;
  currency: string | null;
}

export interface CampaignBudgetInput {
  budget: number | null;
  creatorBudget: number | null;
  productionBudget: number | null;
  paidMediaBudget: number | null;
  agencyFee: number | null;
  otherBudget: number | null;
}

export interface BudgetSummary {
  totalBudget: number | null;
  totalAllocated: number;
  overallRemaining: number | null;
  isOverAllocated: boolean;
  creatorBudget: number | null;
  estimatedCreatorSpend: number;
  confirmedCreatorSpend: number;
  creatorBudgetRemaining: number | null;
  isOverCreatorBudget: boolean;
  currenciesUsed: string[];
  warnings: string[];
}

// A fee that's been negotiated or approved is "confirmed" — approved wins
// when both are set, since it represents the more final sign-off.
function confirmedFee(row: CampaignCreatorFeeInput): number | null {
  return row.approvedFee ?? row.negotiatedFee ?? null;
}

function estimatedFee(row: CampaignCreatorFeeInput): number | null {
  return confirmedFee(row) ?? row.proposedFee ?? null;
}

export function calculateCampaignBudget(
  campaign: CampaignBudgetInput,
  creatorFees: CampaignCreatorFeeInput[]
): BudgetSummary {
  const warnings: string[] = [];

  const subBudgets = [
    campaign.creatorBudget,
    campaign.productionBudget,
    campaign.paidMediaBudget,
    campaign.agencyFee,
    campaign.otherBudget,
  ];
  const totalAllocated = subBudgets.reduce((sum: number, v) => sum + (v ?? 0), 0);

  const overallRemaining = campaign.budget !== null ? campaign.budget - totalAllocated : null;
  const isOverAllocated = campaign.budget !== null && totalAllocated > campaign.budget;
  if (isOverAllocated) {
    warnings.push("Allocated sub-budgets exceed the total campaign budget");
  }

  // "Committed" rows — shortlisted or selected — are the ones that count
  // toward creator spend; a rejected or not-yet-decided creator doesn't.
  const committedRows = creatorFees.filter(
    (r) => r.selectionStatus === "shortlisted" || r.selectionStatus === "selected"
  );
  const selectedRows = creatorFees.filter((r) => r.selectionStatus === "selected");

  const estimatedCreatorSpend = committedRows.reduce((sum, r) => sum + (estimatedFee(r) ?? 0), 0);
  const confirmedCreatorSpend = selectedRows.reduce((sum, r) => sum + (confirmedFee(r) ?? 0), 0);

  const creatorBudgetRemaining =
    campaign.creatorBudget !== null ? campaign.creatorBudget - estimatedCreatorSpend : null;
  // estimatedCreatorSpend is always >= confirmedCreatorSpend (it covers
  // shortlisted + selected rows and never under-counts a selected row's
  // fee), so checking it alone also covers the confirmed-spend case.
  const isOverCreatorBudget = campaign.creatorBudget !== null && estimatedCreatorSpend > campaign.creatorBudget;
  if (isOverCreatorBudget) {
    warnings.push("Estimated creator spend exceeds the creator budget");
  }

  const currenciesUsed = [
    ...new Set(committedRows.map((r) => r.currency).filter((c): c is string => Boolean(c))),
  ];
  if (currenciesUsed.length > 1) {
    warnings.push(`Multiple currencies in use among selected creators (${currenciesUsed.join(", ")})`);
  }

  return {
    totalBudget: campaign.budget,
    totalAllocated,
    overallRemaining,
    isOverAllocated,
    creatorBudget: campaign.creatorBudget,
    estimatedCreatorSpend,
    confirmedCreatorSpend,
    creatorBudgetRemaining,
    isOverCreatorBudget,
    currenciesUsed,
    warnings,
  };
}

// A single proposed/negotiated fee checked against what's left in the
// creator budget right now — used by the selection workspace to warn
// before a specific creator's fee is saved (spec section 25: "Creator
// package exceeds remaining budget").
export function wouldExceedRemainingCreatorBudget(
  fee: number,
  creatorBudgetRemaining: number | null
): boolean {
  return creatorBudgetRemaining !== null && fee > creatorBudgetRemaining;
}
