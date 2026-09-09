"use client";

import { useState, useTransition } from "react";
import { getAllowedNextStatuses } from "@/lib/execution/workflow";
import { updateDeliverableStatus, updateStoryInstanceStatus } from "@/app/(app)/content/actions";
import { DELIVERABLE_STATUS_LABEL, DELIVERABLE_STATUS_STYLE, DELIVERABLE_STATUS_ORDER } from "@/lib/content-labels";
import type { DeliverableStatus } from "@/types/database";

// Excludes "published" from its own option list: publishing a regular
// deliverable or a Story instance has its own dedicated action (creates
// the content_posts row / sets content_url) — see PublishForm /
// PublishStoryForm — so this control only ever drives the rest of the
// workflow (spec section 18), with an explicit override escape hatch for
// an out-of-sequence jump (spec section 20).
export function StatusControl({
  kind,
  id,
  currentStatus,
}: {
  kind: "deliverable" | "story";
  id: string;
  currentStatus: DeliverableStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [override, setOverride] = useState(false);
  const [target, setTarget] = useState<DeliverableStatus | "">("");
  const [error, setError] = useState<string | null>(null);

  const allowed = getAllowedNextStatuses(currentStatus).filter((s) => s !== "published");
  const options = (override ? DELIVERABLE_STATUS_ORDER : allowed).filter((s) => s !== "published" && s !== currentStatus);

  function apply() {
    if (!target) return;
    setError(null);
    startTransition(async () => {
      const fn = kind === "deliverable" ? updateDeliverableStatus : updateStoryInstanceStatus;
      const res = await fn(id, target, { override });
      if (res.error) setError(res.error);
      else setTarget("");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`badge capitalize ${DELIVERABLE_STATUS_STYLE[currentStatus]}`}>
        {DELIVERABLE_STATUS_LABEL[currentStatus]}
      </span>
      <select className="input w-auto" value={target} onChange={(e) => setTarget(e.target.value as DeliverableStatus)}>
        <option value="">Change status…</option>
        {options.map((s) => (
          <option key={s} value={s}>
            {DELIVERABLE_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-xs text-ink-soft">
        <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
        Override
      </label>
      <button type="button" className="btn-secondary py-1" disabled={!target || pending} onClick={apply}>
        {pending ? "Saving…" : "Apply"}
      </button>
      {error ? <span className="text-xs text-status-danger">{error}</span> : null}
    </div>
  );
}
