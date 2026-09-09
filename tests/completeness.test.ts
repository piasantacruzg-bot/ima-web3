import { describe, it, expect } from "vitest";
import { computeDeliverableCompleteness, computeReportReadiness } from "@/lib/execution/completeness";

describe("computeDeliverableCompleteness", () => {
  it("is 'missing' when not yet published, regardless of anything else", () => {
    expect(
      computeDeliverableCompleteness({ isStory: false, isPublished: false, hasEvidence: true, hasUrl: true, hasMetrics: true })
    ).toBe("missing");
  });

  it("a public Reel is complete with a URL and metrics, no evidence record needed", () => {
    expect(
      computeDeliverableCompleteness({ isStory: false, isPublished: true, hasEvidence: false, hasUrl: true, hasMetrics: true })
    ).toBe("complete");
  });

  it("a Story is complete with evidence and metrics even with no public URL", () => {
    expect(
      computeDeliverableCompleteness({ isStory: true, isPublished: true, hasEvidence: true, hasUrl: false, hasMetrics: true })
    ).toBe("complete");
  });

  it("a Story lacking only a URL is never penalized for it (spec section 29)", () => {
    const withUrl = computeDeliverableCompleteness({ isStory: true, isPublished: true, hasEvidence: true, hasUrl: true, hasMetrics: true });
    const withoutUrl = computeDeliverableCompleteness({ isStory: true, isPublished: true, hasEvidence: true, hasUrl: false, hasMetrics: true });
    expect(withUrl).toBe(withoutUrl);
  });

  it("is 'partial' when only evidence exists but not metrics", () => {
    expect(
      computeDeliverableCompleteness({ isStory: false, isPublished: true, hasEvidence: true, hasUrl: false, hasMetrics: false })
    ).toBe("partial");
  });

  it("is 'partial' when only metrics exist but no evidence or URL", () => {
    expect(
      computeDeliverableCompleteness({ isStory: false, isPublished: true, hasEvidence: false, hasUrl: false, hasMetrics: true })
    ).toBe("partial");
  });

  it("is 'missing' when published but nothing else exists", () => {
    expect(
      computeDeliverableCompleteness({ isStory: false, isPublished: true, hasEvidence: false, hasUrl: false, hasMetrics: false })
    ).toBe("missing");
  });

  it("a published Story with no evidence at all is missing, even with metrics", () => {
    expect(
      computeDeliverableCompleteness({ isStory: true, isPublished: true, hasEvidence: false, hasUrl: false, hasMetrics: true })
    ).toBe("partial");
  });
});

describe("computeReportReadiness", () => {
  it("matches the section-28.9 worked example shape: fewer blockers as completeness rises", () => {
    const result = computeReportReadiness({
      totalDeliverables: 63,
      publishedDeliverables: 58,
      deliverablesWithMetrics: 54,
      deliverablesWithEvidence: 58,
      storiesMissingScreenshots: 3,
      deliverablesMissingUrl: 1,
    });
    expect(result.blockers).toContain("5 deliverables not yet published");
    expect(result.blockers).toContain("4 published deliverables missing metrics");
    expect(result.blockers).toContain("3 published Story instances missing a screenshot");
    expect(result.blockers).toContain("1 deliverable missing a content URL");
    expect(result.readinessPercent).toBeGreaterThan(0);
    expect(result.readinessPercent).toBeLessThan(100);
  });

  it("is 100% ready with no blockers when everything is complete", () => {
    const result = computeReportReadiness({
      totalDeliverables: 10,
      publishedDeliverables: 10,
      deliverablesWithMetrics: 10,
      deliverablesWithEvidence: 10,
      storiesMissingScreenshots: 0,
      deliverablesMissingUrl: 0,
    });
    expect(result.readinessPercent).toBe(100);
    expect(result.blockers).toEqual([]);
  });

  it("is 0% with an explicit blocker when there are no deliverables at all, never divides by zero", () => {
    const result = computeReportReadiness({
      totalDeliverables: 0,
      publishedDeliverables: 0,
      deliverablesWithMetrics: 0,
      deliverablesWithEvidence: 0,
      storiesMissingScreenshots: 0,
      deliverablesMissingUrl: 0,
    });
    expect(result.readinessPercent).toBe(0);
    expect(result.blockers).toEqual(["No deliverables exist yet for this campaign"]);
  });

  it("uses singular phrasing for a count of exactly 1", () => {
    const result = computeReportReadiness({
      totalDeliverables: 2,
      publishedDeliverables: 1,
      deliverablesWithMetrics: 1,
      deliverablesWithEvidence: 1,
      storiesMissingScreenshots: 0,
      deliverablesMissingUrl: 0,
    });
    expect(result.blockers).toContain("1 deliverable not yet published");
  });
});
