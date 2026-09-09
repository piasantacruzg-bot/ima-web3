import { describe, it, expect } from "vitest";
import { checkStatusTransition, getAllowedNextStatuses, isTerminalStatus } from "@/lib/execution/workflow";

describe("checkStatusTransition — the happy path", () => {
  const path: [string, string][] = [
    ["assigned", "brief"],
    ["brief", "draft"],
    ["draft", "submitted"],
    ["submitted", "in_review"],
    ["in_review", "approved"],
    ["approved", "scheduled"],
    ["scheduled", "published"],
    ["published", "metrics_collected"],
  ];

  it.each(path)("allows %s -> %s", (from, to) => {
    const result = checkStatusTransition(from as any, to as any);
    expect(result.valid).toBe(true);
    expect(result.overridden).toBeUndefined();
  });
});

describe("checkStatusTransition — the revision loop", () => {
  it("allows in_review -> needs_revision -> draft", () => {
    expect(checkStatusTransition("in_review", "needs_revision").valid).toBe(true);
    expect(checkStatusTransition("needs_revision", "draft").valid).toBe(true);
  });

  it("does not allow needs_revision to jump straight to approved", () => {
    expect(checkStatusTransition("needs_revision", "approved").valid).toBe(false);
  });
});

describe("checkStatusTransition — invalid jumps are blocked by default", () => {
  it("blocks assigned -> published", () => {
    const result = checkStatusTransition("assigned", "published");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/without an explicit override/);
  });

  it("blocks draft -> approved (skipping submission and review)", () => {
    expect(checkStatusTransition("draft", "approved").valid).toBe(false);
  });

  it("blocks published -> draft (no going backward after publication)", () => {
    expect(checkStatusTransition("published", "draft").valid).toBe(false);
  });
});

describe("checkStatusTransition — explicit override", () => {
  it("allows an otherwise-invalid jump when overridden, and flags it as such", () => {
    const result = checkStatusTransition("assigned", "published", { override: true });
    expect(result.valid).toBe(true);
    expect(result.overridden).toBe(true);
  });

  it("does not flag a normal transition as overridden even if override is passed", () => {
    const result = checkStatusTransition("draft", "submitted", { override: true });
    expect(result.valid).toBe(true);
    expect(result.overridden).toBeUndefined();
  });
});

describe("checkStatusTransition — cancellation and no-ops", () => {
  it("allows cancelling from any pre-publication stage", () => {
    for (const stage of ["assigned", "brief", "draft", "submitted", "in_review", "needs_revision", "approved", "scheduled"]) {
      expect(checkStatusTransition(stage as any, "cancelled").valid).toBe(true);
    }
  });

  it("does not allow cancelling an already-published deliverable without override", () => {
    expect(checkStatusTransition("published", "cancelled").valid).toBe(false);
  });

  it("treats setting the same status as a no-op success", () => {
    expect(checkStatusTransition("draft", "draft").valid).toBe(true);
  });

  it("treats the legacy not_started status the same as assigned", () => {
    expect(checkStatusTransition("not_started", "draft").valid).toBe(true);
    expect(checkStatusTransition("not_started", "published").valid).toBe(false);
  });
});

describe("getAllowedNextStatuses / isTerminalStatus", () => {
  it("lists the real next steps for a given stage", () => {
    expect(getAllowedNextStatuses("draft")).toEqual(["submitted", "cancelled"]);
  });

  it("never lists 'late' as an allowed next status for any stage", () => {
    const allStages: string[] = [
      "not_started", "assigned", "brief", "draft", "submitted", "in_review",
      "needs_revision", "approved", "scheduled", "published", "metrics_collected",
      "late", "cancelled",
    ];
    for (const stage of allStages) {
      expect(getAllowedNextStatuses(stage as any)).not.toContain("late");
    }
  });

  it("identifies terminal stages correctly", () => {
    expect(isTerminalStatus("metrics_collected")).toBe(true);
    expect(isTerminalStatus("cancelled")).toBe(true);
    expect(isTerminalStatus("late")).toBe(true);
    expect(isTerminalStatus("draft")).toBe(false);
  });
});
