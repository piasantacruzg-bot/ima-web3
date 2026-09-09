// Deliverable/Story content workflow (spec section 17). Pure, deterministic
// validation of status transitions — no invalid jump is allowed silently;
// an explicit override is always available for the genuine exceptions
// (an admin correcting a mistake, a deliverable that was actually
// published off-workflow), but it's never the default path.

import type { DeliverableStatus } from "@/types/database";

// Linear pipeline: assigned -> brief -> draft -> submitted -> in_review ->
// (needs_revision loops back to draft) -> approved -> scheduled ->
// published -> metrics_collected. `cancelled` is reachable from any
// pre-publication stage. `not_started` is the legacy (Phase 1) synonym for
// `assigned` and behaves identically here. `late` is never a transition
// target — it's a computed overlay (see deliverables_with_computed_status)
// on top of whatever the real stage is, never a stored value a transition
// produces.
const FORWARD_TRANSITIONS: Record<DeliverableStatus, DeliverableStatus[]> = {
  not_started: ["assigned", "brief", "draft", "cancelled"],
  assigned: ["brief", "draft", "cancelled"],
  brief: ["draft", "cancelled"],
  draft: ["submitted", "cancelled"],
  submitted: ["in_review", "cancelled"],
  in_review: ["needs_revision", "approved", "cancelled"],
  needs_revision: ["draft", "cancelled"],
  approved: ["scheduled", "published", "cancelled"],
  scheduled: ["published", "cancelled"],
  published: ["metrics_collected"],
  metrics_collected: [],
  late: [],
  cancelled: [],
};

export interface TransitionCheck {
  valid: boolean;
  reason?: string;
  overridden?: boolean;
}

export function checkStatusTransition(
  from: DeliverableStatus,
  to: DeliverableStatus,
  options?: { override?: boolean }
): TransitionCheck {
  if (from === to) return { valid: true };

  const allowed = FORWARD_TRANSITIONS[from] ?? [];
  if (allowed.includes(to)) return { valid: true };

  if (options?.override) {
    return { valid: true, overridden: true, reason: `Overridden: "${from}" -> "${to}" is not a normal transition` };
  }

  return {
    valid: false,
    reason: `Cannot move from "${from}" to "${to}" without an explicit override`,
  };
}

export function getAllowedNextStatuses(current: DeliverableStatus): DeliverableStatus[] {
  return FORWARD_TRANSITIONS[current] ?? [];
}

export function isTerminalStatus(status: DeliverableStatus): boolean {
  return getAllowedNextStatuses(status).length === 0;
}
