import { describe, it, expect } from "vitest";
import {
  calculateCampaignBudget,
  wouldExceedRemainingCreatorBudget,
  type CampaignBudgetInput,
  type CampaignCreatorFeeInput,
} from "@/lib/campaigns/budget";

function fee(overrides: Partial<CampaignCreatorFeeInput>): CampaignCreatorFeeInput {
  return {
    creatorId: "c1",
    selectionStatus: "selected",
    proposedFee: null,
    negotiatedFee: null,
    approvedFee: null,
    currency: "USD",
    ...overrides,
  };
}

const emptyBudget: CampaignBudgetInput = {
  budget: null,
  creatorBudget: null,
  productionBudget: null,
  paidMediaBudget: null,
  agencyFee: null,
  otherBudget: null,
};

describe("calculateCampaignBudget — the section 24 worked example", () => {
  it("matches the example: $25,000 budget, $18,000 creator budget, $15,500 committed, $2,500 remaining", () => {
    const rows = [
      fee({ creatorId: "a", selectionStatus: "selected", approvedFee: 8000 }),
      fee({ creatorId: "b", selectionStatus: "selected", approvedFee: 7500 }),
    ];
    const summary = calculateCampaignBudget(
      { ...emptyBudget, budget: 25_000, creatorBudget: 18_000 },
      rows
    );
    expect(summary.estimatedCreatorSpend).toBe(15_500);
    expect(summary.creatorBudgetRemaining).toBe(2_500);
    expect(summary.isOverCreatorBudget).toBe(false);
  });
});

describe("calculateCampaignBudget — allocation", () => {
  it("sums sub-budgets into totalAllocated and computes overall remaining", () => {
    const summary = calculateCampaignBudget(
      {
        budget: 20_000,
        creatorBudget: 12_000,
        productionBudget: 3_000,
        paidMediaBudget: 2_000,
        agencyFee: 1_000,
        otherBudget: 500,
      },
      []
    );
    expect(summary.totalAllocated).toBe(18_500);
    expect(summary.overallRemaining).toBe(1_500);
    expect(summary.isOverAllocated).toBe(false);
  });

  it("warns when sub-budgets exceed the total budget", () => {
    const summary = calculateCampaignBudget(
      { ...emptyBudget, budget: 10_000, creatorBudget: 8_000, productionBudget: 5_000 },
      []
    );
    expect(summary.isOverAllocated).toBe(true);
    expect(summary.warnings).toContain("Allocated sub-budgets exceed the total campaign budget");
  });

  it("treats an unset total budget as no overall-remaining figure rather than 0", () => {
    const summary = calculateCampaignBudget({ ...emptyBudget, creatorBudget: 5000 }, []);
    expect(summary.totalBudget).toBeNull();
    expect(summary.overallRemaining).toBeNull();
  });
});

describe("calculateCampaignBudget — creator spend", () => {
  it("only counts shortlisted/selected rows, never rejected ones", () => {
    const rows = [
      fee({ selectionStatus: "selected", approvedFee: 1000 }),
      fee({ selectionStatus: "shortlisted", proposedFee: 500 }),
      fee({ selectionStatus: "rejected", proposedFee: 9999 }),
    ];
    const summary = calculateCampaignBudget({ ...emptyBudget, creatorBudget: 10_000 }, rows);
    expect(summary.estimatedCreatorSpend).toBe(1500);
  });

  it("falls back proposed -> negotiated -> approved for the estimate", () => {
    const rows = [
      fee({ selectionStatus: "shortlisted", proposedFee: 500 }),
      fee({ selectionStatus: "selected", negotiatedFee: 800 }),
      fee({ selectionStatus: "selected", proposedFee: 100, negotiatedFee: 200, approvedFee: 300 }),
    ];
    const summary = calculateCampaignBudget({ ...emptyBudget, creatorBudget: 10_000 }, rows);
    expect(summary.estimatedCreatorSpend).toBe(500 + 800 + 300);
  });

  it("confirmedCreatorSpend only counts approved/negotiated fees on selected rows", () => {
    const rows = [
      fee({ selectionStatus: "selected", proposedFee: 500 }), // no confirmed fee yet
      fee({ selectionStatus: "selected", negotiatedFee: 800 }),
    ];
    const summary = calculateCampaignBudget({ ...emptyBudget, creatorBudget: 10_000 }, rows);
    expect(summary.confirmedCreatorSpend).toBe(800);
  });

  it("warns when estimated creator spend exceeds the creator budget", () => {
    const rows = [fee({ selectionStatus: "selected", approvedFee: 20_000 })];
    const summary = calculateCampaignBudget({ ...emptyBudget, creatorBudget: 18_000 }, rows);
    expect(summary.isOverCreatorBudget).toBe(true);
    expect(summary.warnings).toContain("Estimated creator spend exceeds the creator budget");
  });
});

describe("calculateCampaignBudget — currency", () => {
  it("does not warn when every committed creator uses the same currency", () => {
    const rows = [
      fee({ selectionStatus: "selected", approvedFee: 100, currency: "USD" }),
      fee({ selectionStatus: "shortlisted", proposedFee: 100, currency: "USD" }),
    ];
    const summary = calculateCampaignBudget(emptyBudget, rows);
    expect(summary.warnings.some((w) => /currenc/i.test(w))).toBe(false);
  });

  it("warns when committed creators use different currencies", () => {
    const rows = [
      fee({ selectionStatus: "selected", approvedFee: 100, currency: "USD" }),
      fee({ selectionStatus: "selected", approvedFee: 100, currency: "EUR" }),
    ];
    const summary = calculateCampaignBudget(emptyBudget, rows);
    expect(summary.warnings.some((w) => /currenc/i.test(w))).toBe(true);
  });

  it("ignores currency on rows that aren't committed", () => {
    const rows = [
      fee({ selectionStatus: "selected", approvedFee: 100, currency: "USD" }),
      fee({ selectionStatus: "rejected", approvedFee: 100, currency: "EUR" }),
    ];
    const summary = calculateCampaignBudget(emptyBudget, rows);
    expect(summary.currenciesUsed).toEqual(["USD"]);
  });
});

describe("wouldExceedRemainingCreatorBudget", () => {
  it("flags a fee larger than what remains", () => {
    expect(wouldExceedRemainingCreatorBudget(3000, 2500)).toBe(true);
  });

  it("does not flag a fee within what remains", () => {
    expect(wouldExceedRemainingCreatorBudget(2000, 2500)).toBe(false);
  });

  it("never flags when there is no creator budget set", () => {
    expect(wouldExceedRemainingCreatorBudget(1_000_000, null)).toBe(false);
  });
});
