import { describe, it, expect } from "vitest";
import { computeCampaignHealth, type CampaignHealthInput } from "@/lib/campaign-health";

function baseInput(overrides: Partial<CampaignHealthInput> = {}): CampaignHealthInput {
  return {
    totalDeliverables: 10,
    overdueDeliverables: 0,
    publishedDeliverables: 10,
    missingContentUrl: 0,
    missingEvidence: 0,
    missingMetrics: 0,
    connectedAccounts: 0,
    syncErrorAccounts: 0,
    ...overrides,
  };
}

describe("computeCampaignHealth", () => {
  it("is 100% across every dimension when everything is complete", () => {
    const result = computeCampaignHealth(baseInput());
    expect(result).toEqual({ executionHealth: 100, contentHealth: 100, metricsHealth: 100, evidenceHealth: 100, overallHealth: 100 });
  });

  it("is 0% everywhere with no deliverables at all, never a false 100%", () => {
    const result = computeCampaignHealth(baseInput({ totalDeliverables: 0, publishedDeliverables: 0 }));
    expect(result).toEqual({ executionHealth: 0, contentHealth: 0, metricsHealth: 0, evidenceHealth: 0, overallHealth: 0 });
  });

  it("execution health drops proportionally to overdue deliverables", () => {
    const result = computeCampaignHealth(baseInput({ overdueDeliverables: 5 }));
    expect(result.executionHealth).toBe(50);
  });

  it("metrics/evidence health are measured against published items, not the whole campaign", () => {
    const result = computeCampaignHealth(baseInput({ totalDeliverables: 10, publishedDeliverables: 4, missingMetrics: 2, missingEvidence: 1 }));
    expect(result.metricsHealth).toBe(50); // 2 of 4 published missing metrics
    expect(result.evidenceHealth).toBe(75); // 1 of 4 published missing evidence
  });

  it("content health factors in sync errors on connected accounts", () => {
    const healthy = computeCampaignHealth(baseInput({ connectedAccounts: 4, syncErrorAccounts: 0 }));
    const broken = computeCampaignHealth(baseInput({ connectedAccounts: 4, syncErrorAccounts: 4 }));
    expect(healthy.contentHealth).toBeGreaterThan(broken.contentHealth);
  });

  it("overall health is the average of the four sub-scores", () => {
    const result = computeCampaignHealth(baseInput({ overdueDeliverables: 10, missingContentUrl: 0, connectedAccounts: 0 }));
    // executionHealth=0, contentHealth=100 (no missing urls, no accounts to fail), metricsHealth=100, evidenceHealth=100
    expect(result.overallHealth).toBe(Math.round((0 + 100 + 100 + 100) / 4));
  });
});
