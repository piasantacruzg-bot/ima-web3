// Deterministic automation rules (spec section 26) — four fixed,
// transparent checks, not a general rule engine. Pure functions; the
// DB-touching orchestrator that turns a "true" into a notification row
// lives in lib/automation.ts.

import type { DeliverableStatus, OauthStatus, SyncStatus } from "@/types/database";

const TERMINAL_STATUSES: DeliverableStatus[] = ["published", "cancelled", "metrics_collected"];

export function isDeliverableOverdue(
  deliverable: { status: DeliverableStatus; due_date: string | null },
  now: Date = new Date()
): boolean {
  if (!deliverable.due_date) return false;
  if (TERMINAL_STATUSES.includes(deliverable.status)) return false;
  return new Date(deliverable.due_date).getTime() < now.getTime();
}

export interface MetricsMissingInput {
  isPublished: boolean;
  hasMetrics: boolean;
  publishedAt: string | null;
}

// Grace period avoids flagging a deliverable the instant it's published
// — metrics_missing.config.grace_hours (automation_rules) controls it,
// defaulting to 24h.
export function isMetricsMissing(input: MetricsMissingInput, graceHours = 24, now: Date = new Date()): boolean {
  if (!input.isPublished || input.hasMetrics) return false;
  if (!input.publishedAt) return true;
  const hoursSincePublished = (now.getTime() - new Date(input.publishedAt).getTime()) / (60 * 60 * 1000);
  return hoursSincePublished >= graceHours;
}

export function isEvidenceMissing(input: { isPublished: boolean; hasEvidence: boolean }): boolean {
  return input.isPublished && !input.hasEvidence;
}

export function isConnectionExpired(account: { oauth_status: OauthStatus; sync_status: SyncStatus }): boolean {
  return account.oauth_status === "expired" || account.oauth_status === "error" || account.sync_status === "error";
}
