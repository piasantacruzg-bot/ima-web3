// Metric conflict detection + source-priority resolution (spec sections
// 29-30). Pure functions over already-fetched metric snapshots — no I/O
// here. Conflicts are never resolved by silently overwriting: every
// snapshot that ever existed stays exactly as captured; "resolving" a
// conflict only changes which value the UI treats as current (recorded
// via an audit_log entry — see resolveMetricConflict in
// app/(app)/content/actions.ts), never deletes or edits a row.

import type { MetricSource } from "@/types/database";

export interface MetricSnapshotLike {
  id: string;
  captured_at: string;
  source: MetricSource;
  views: number | null;
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  reposts: number | null;
  saves: number | null;
}

export const CONFLICT_FIELDS = ["views", "reach", "impressions", "likes", "comments", "shares", "reposts", "saves"] as const;
export type ConflictField = (typeof CONFLICT_FIELDS)[number];

const DEFAULT_TOLERANCE_RATIO = 0.05;

// Values within the tolerance band aren't flagged — small drift between
// an API count and a hand-typed one isn't a real conflict.
export function valuesConflict(a: number | null, b: number | null, toleranceRatio = DEFAULT_TOLERANCE_RATIO): boolean {
  if (a === null || b === null) return false;
  if (a === b) return false;
  const base = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) / base > toleranceRatio;
}

export interface MetricConflict {
  field: ConflictField;
  apiValue: number;
  apiSnapshotId: string;
  apiCapturedAt: string;
  manualValue: number;
  manualSnapshotId: string;
  manualCapturedAt: string;
}

function latestBySource(snapshots: MetricSnapshotLike[], source: MetricSource): MetricSnapshotLike | null {
  const matching = snapshots.filter((s) => s.source === source);
  if (matching.length === 0) return null;
  return matching.reduce((latest, s) => (new Date(s.captured_at) > new Date(latest.captured_at) ? s : latest));
}

// Compares the latest API-sourced snapshot against the latest
// manual-sourced snapshot, field by field. Imported/screenshot/url
// sources aren't compared here — the brief's example is specifically
// "API vs manual".
export function findMetricConflicts(snapshots: MetricSnapshotLike[], toleranceRatio = DEFAULT_TOLERANCE_RATIO): MetricConflict[] {
  const latestApi = latestBySource(snapshots, "api");
  const latestManual = latestBySource(snapshots, "manual");
  if (!latestApi || !latestManual) return [];

  const conflicts: MetricConflict[] = [];
  for (const field of CONFLICT_FIELDS) {
    const apiValue = latestApi[field];
    const manualValue = latestManual[field];
    if (apiValue !== null && manualValue !== null && valuesConflict(apiValue, manualValue, toleranceRatio)) {
      conflicts.push({
        field,
        apiValue,
        apiSnapshotId: latestApi.id,
        apiCapturedAt: latestApi.captured_at,
        manualValue,
        manualSnapshotId: latestManual.id,
        manualCapturedAt: latestManual.captured_at,
      });
    }
  }
  return conflicts;
}

// Default priority order (spec section 30): official API first, then
// the most recent manual entry, then imported, then anything older.
// This decides which value is *displayed* as current — it never
// deletes or edits lower-priority history.
const SOURCE_PRIORITY: MetricSource[] = ["api", "manual", "imported", "screenshot", "url"];

export interface PreferredValue {
  value: number;
  source: MetricSource;
  capturedAt: string;
  snapshotId: string;
}

export function getPreferredValue(snapshots: MetricSnapshotLike[], field: ConflictField): PreferredValue | null {
  for (const source of SOURCE_PRIORITY) {
    const candidates = snapshots.filter((s) => s.source === source && s[field] !== null);
    if (candidates.length === 0) continue;
    const latest = candidates.reduce((a, b) => (new Date(b.captured_at) > new Date(a.captured_at) ? b : a));
    return { value: latest[field] as number, source, capturedAt: latest.captured_at, snapshotId: latest.id };
  }
  return null;
}
