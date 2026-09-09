// Campaign health scoring (spec section 23) — four named sub-scores plus
// one overall percentage, computed from already-fetched counts. Never a
// stored value: recomputed on every read from the same execution data
// the rest of Phase 5/6 already aggregates from, so it can never drift
// from what the dashboard/report actually show.

export interface CampaignHealthInput {
  totalDeliverables: number;
  overdueDeliverables: number;
  publishedDeliverables: number;
  missingContentUrl: number;
  missingEvidence: number;
  missingMetrics: number;
  connectedAccounts: number;
  syncErrorAccounts: number;
}

export interface CampaignHealthResult {
  executionHealth: number;
  contentHealth: number;
  metricsHealth: number;
  evidenceHealth: number;
  overallHealth: number;
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function computeCampaignHealth(input: CampaignHealthInput): CampaignHealthResult {
  const total = input.totalDeliverables;
  if (total === 0) {
    return { executionHealth: 0, contentHealth: 0, metricsHealth: 0, evidenceHealth: 0, overallHealth: 0 };
  }

  const executionHealth = pct(total - input.overdueDeliverables, total);

  // API sync health folds into content health — a broken connection
  // directly limits how much content can even be discovered/matched.
  const syncHealth = input.connectedAccounts > 0 ? pct(input.connectedAccounts - input.syncErrorAccounts, input.connectedAccounts) : 100;
  const urlHealth = pct(total - input.missingContentUrl, total);
  const contentHealth = Math.round((urlHealth + syncHealth) / 2);

  const publishedBase = Math.max(input.publishedDeliverables, 0);
  const metricsHealth = publishedBase === 0 ? 0 : pct(publishedBase - input.missingMetrics, publishedBase);
  const evidenceHealth = publishedBase === 0 ? 0 : pct(publishedBase - input.missingEvidence, publishedBase);

  const overallHealth = Math.round((executionHealth + contentHealth + metricsHealth + evidenceHealth) / 4);

  return { executionHealth, contentHealth, metricsHealth, evidenceHealth, overallHealth };
}
