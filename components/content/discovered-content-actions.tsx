"use client";

import { useState, useTransition } from "react";
import { confirmContentMatch, ignoreDiscoveredContent } from "@/app/(app)/content/actions";

export interface DeliverableOption {
  deliverableId: string;
  label: string;
  confidence?: number;
}

export function DiscoveredContentActions({
  discoveredContentId,
  options,
}: {
  discoveredContentId: string;
  options: DeliverableOption[];
}) {
  const [selected, setSelected] = useState(options[0]?.deliverableId ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const res = await confirmContentMatch(discoveredContentId, selected);
      if (res.error) setError(res.error);
    });
  }

  function ignore() {
    setError(null);
    startTransition(async () => {
      const res = await ignoreDiscoveredContent(discoveredContentId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.length > 0 ? (
        <select className="input w-auto" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {options.map((opt) => (
            <option key={opt.deliverableId} value={opt.deliverableId}>
              {opt.label}
              {opt.confidence !== undefined ? ` (${opt.confidence}% confidence)` : ""}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-xs text-ink-soft">No open deliverable to assign to.</span>
      )}
      <button type="button" className="btn-primary py-1.5 text-xs" disabled={pending || !selected} onClick={confirm}>
        {pending ? "Working…" : "Confirm match"}
      </button>
      <button type="button" className="btn-secondary py-1.5 text-xs" disabled={pending} onClick={ignore}>
        Ignore
      </button>
      {error ? <span className="text-xs text-status-danger">{error}</span> : null}
    </div>
  );
}
