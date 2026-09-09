// Evidence/metrics completeness and report readiness (spec sections 29,
// 28.7-28.9). Pure functions over pre-computed booleans/counts — the
// caller (lib/execution.ts) does the database reads.
//
// The core rule (spec section 29): a Story is never incomplete merely for
// lacking a public URL — its evidence requirement is a screenshot/Drive
// file, not a URL. A non-Story deliverable can satisfy its evidence
// requirement with either a URL or an evidence record.

export type CompletenessState = "complete" | "partial" | "missing";

export interface DeliverableCompletenessInput {
  isStory: boolean;
  isPublished: boolean;
  hasEvidence: boolean;
  hasUrl: boolean;
  hasMetrics: boolean;
}

export function computeDeliverableCompleteness(input: DeliverableCompletenessInput): CompletenessState {
  if (!input.isPublished) return "missing";

  const evidenceSatisfied = input.isStory ? input.hasEvidence : input.hasUrl || input.hasEvidence;
  if (evidenceSatisfied && input.hasMetrics) return "complete";
  if (evidenceSatisfied || input.hasMetrics) return "partial";
  return "missing";
}

export interface ReportReadinessInput {
  totalDeliverables: number;
  publishedDeliverables: number;
  deliverablesWithMetrics: number;
  deliverablesWithEvidence: number;
  storiesMissingScreenshots: number;
  deliverablesMissingUrl: number;
}

export interface ReportReadinessResult {
  readinessPercent: number;
  blockers: string[];
}

// Readiness weighs three equally-important completions: every deliverable
// is published, has metrics, and has evidence. A campaign with zero
// deliverables is 0% ready (nothing to report), not 100% (never divide by
// zero into a false "done").
export function computeReportReadiness(input: ReportReadinessInput): ReportReadinessResult {
  const blockers: string[] = [];

  if (input.totalDeliverables === 0) {
    return { readinessPercent: 0, blockers: ["No deliverables exist yet for this campaign"] };
  }

  const pendingPublication = input.totalDeliverables - input.publishedDeliverables;
  if (pendingPublication > 0) {
    blockers.push(
      `${pendingPublication} deliverable${pendingPublication === 1 ? "" : "s"} not yet published`
    );
  }

  const missingMetrics = input.publishedDeliverables - input.deliverablesWithMetrics;
  if (missingMetrics > 0) {
    blockers.push(`${missingMetrics} published deliverable${missingMetrics === 1 ? "" : "s"} missing metrics`);
  }

  const missingEvidence = input.publishedDeliverables - input.deliverablesWithEvidence;
  if (missingEvidence > 0) {
    blockers.push(`${missingEvidence} published deliverable${missingEvidence === 1 ? "" : "s"} missing evidence`);
  }

  if (input.storiesMissingScreenshots > 0) {
    blockers.push(
      `${input.storiesMissingScreenshots} published Story instance${input.storiesMissingScreenshots === 1 ? "" : "s"} missing a screenshot`
    );
  }

  if (input.deliverablesMissingUrl > 0) {
    blockers.push(
      `${input.deliverablesMissingUrl} deliverable${input.deliverablesMissingUrl === 1 ? "" : "s"} missing a content URL`
    );
  }

  const completionScore =
    (input.publishedDeliverables + input.deliverablesWithMetrics + input.deliverablesWithEvidence) /
    (3 * input.totalDeliverables);

  return {
    readinessPercent: Math.round(completionScore * 100),
    blockers,
  };
}
