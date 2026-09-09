import { describe, it, expect } from "vitest";
import { valuesConflict, findMetricConflicts, getPreferredValue, type MetricSnapshotLike } from "@/lib/metric-conflicts";

function snapshot(overrides: Partial<MetricSnapshotLike> = {}): MetricSnapshotLike {
  return {
    id: "m1",
    captured_at: "2026-06-01T00:00:00Z",
    source: "manual",
    views: null,
    reach: null,
    impressions: null,
    likes: null,
    comments: null,
    shares: null,
    reposts: null,
    saves: null,
    ...overrides,
  };
}

describe("valuesConflict", () => {
  it("is not a conflict when either value is null (nothing to compare)", () => {
    expect(valuesConflict(100, null)).toBe(false);
    expect(valuesConflict(null, 100)).toBe(false);
  });

  it("is not a conflict for identical values", () => {
    expect(valuesConflict(100, 100)).toBe(false);
  });

  it("is not a conflict for small drift within tolerance", () => {
    expect(valuesConflict(100000, 101000)).toBe(false); // 1% drift
  });

  it("is a conflict for values that differ beyond tolerance", () => {
    expect(valuesConflict(125400, 121800)).toBe(false); // ~3% drift — still within the default 5% tolerance
    expect(valuesConflict(125400, 100000)).toBe(true); // ~25% gap, clearly a conflict
  });
});

describe("findMetricConflicts", () => {
  it("flags views when the latest API and latest manual snapshots disagree beyond tolerance", () => {
    const snapshots = [
      snapshot({ id: "api-1", source: "api", captured_at: "2026-06-05T00:00:00Z", views: 125400, likes: 8000 }),
      snapshot({ id: "manual-1", source: "manual", captured_at: "2026-06-04T00:00:00Z", views: 90000, likes: 8000 }),
    ];
    const conflicts = findMetricConflicts(snapshots);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ field: "views", apiValue: 125400, manualValue: 90000 });
  });

  it("returns no conflicts when there's no API snapshot to compare against", () => {
    const snapshots = [snapshot({ id: "manual-1", source: "manual", views: 100 })];
    expect(findMetricConflicts(snapshots)).toEqual([]);
  });

  it("returns no conflicts when values agree within tolerance", () => {
    const snapshots = [
      snapshot({ id: "api-1", source: "api", views: 100000, likes: 5000 }),
      snapshot({ id: "manual-1", source: "manual", views: 100500, likes: 5010 }),
    ];
    expect(findMetricConflicts(snapshots)).toEqual([]);
  });

  it("compares only the latest snapshot of each source, not every historical one", () => {
    const snapshots = [
      snapshot({ id: "api-old", source: "api", captured_at: "2026-06-01T00:00:00Z", views: 1000000 }),
      snapshot({ id: "api-new", source: "api", captured_at: "2026-06-10T00:00:00Z", views: 100000 }),
      snapshot({ id: "manual-1", source: "manual", captured_at: "2026-06-05T00:00:00Z", views: 99000 }),
    ];
    const conflicts = findMetricConflicts(snapshots);
    // api-new (100000) vs manual-1 (99000) is within tolerance -> no conflict,
    // even though api-old (1000000) would have conflicted.
    expect(conflicts).toEqual([]);
  });
});

describe("getPreferredValue — source priority, never destructive", () => {
  it("prefers the API value over manual when both exist", () => {
    const snapshots = [
      snapshot({ id: "manual-1", source: "manual", captured_at: "2026-06-01T00:00:00Z", views: 100 }),
      snapshot({ id: "api-1", source: "api", captured_at: "2026-06-02T00:00:00Z", views: 200 }),
    ];
    const preferred = getPreferredValue(snapshots, "views");
    expect(preferred).toMatchObject({ value: 200, source: "api" });
  });

  it("falls back to the most recent manual value when no API value exists", () => {
    const snapshots = [
      snapshot({ id: "manual-old", source: "manual", captured_at: "2026-06-01T00:00:00Z", views: 100 }),
      snapshot({ id: "manual-new", source: "manual", captured_at: "2026-06-05T00:00:00Z", views: 150 }),
    ];
    const preferred = getPreferredValue(snapshots, "views");
    expect(preferred).toMatchObject({ value: 150, source: "manual" });
  });

  it("falls back to imported data when no API or manual value exists", () => {
    const snapshots = [snapshot({ id: "imported-1", source: "imported", views: 300 })];
    expect(getPreferredValue(snapshots, "views")).toMatchObject({ value: 300, source: "imported" });
  });

  it("returns null (not zero) when the field is missing from every snapshot", () => {
    const snapshots = [snapshot({ id: "m1", source: "api", views: null })];
    expect(getPreferredValue(snapshots, "views")).toBeNull();
  });

  it("never removes or mutates the lower-priority snapshot it doesn't prefer", () => {
    const manual = snapshot({ id: "manual-1", source: "manual", views: 100 });
    const api = snapshot({ id: "api-1", source: "api", views: 200 });
    const snapshots = [manual, api];
    getPreferredValue(snapshots, "views");
    // The function is pure — the input array/objects are untouched.
    expect(snapshots).toContain(manual);
    expect(snapshots).toContain(api);
    expect(manual.views).toBe(100);
  });
});
