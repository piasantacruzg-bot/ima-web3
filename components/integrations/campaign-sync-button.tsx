"use client";

import { useState, useTransition } from "react";
import { syncCampaignNow } from "@/app/(app)/campaigns/actions";

export function CampaignSyncButton({ campaignId }: { campaignId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function sync() {
    setMessage(null);
    startTransition(async () => {
      const outcomes = await syncCampaignNow(campaignId);
      if (outcomes.length === 0) {
        setMessage("No connected accounts to sync.");
        return;
      }
      const created = outcomes.reduce((sum, o) => sum + o.recordsCreated, 0);
      const updated = outcomes.reduce((sum, o) => sum + o.recordsUpdated, 0);
      const failed = outcomes.reduce((sum, o) => sum + o.recordsFailed, 0);
      setMessage(`${created} new, ${updated} metrics updated, ${failed} failed.`);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" className="btn-secondary" disabled={pending} onClick={sync}>
        {pending ? "Syncing…" : "Sync now"}
      </button>
      {message ? <span className="text-xs text-ink-soft">{message}</span> : null}
    </div>
  );
}
