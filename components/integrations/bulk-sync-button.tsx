"use client";

import { useState, useTransition } from "react";
import { syncAllConnectedAccounts } from "@/app/(app)/settings/integrations/actions";

export function BulkSyncButton({ connectedCount }: { connectedCount: number }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function syncAll() {
    setMessage(`Syncing ${connectedCount} account${connectedCount === 1 ? "" : "s"}…`);
    startTransition(async () => {
      const summary = await syncAllConnectedAccounts();
      setMessage(
        `${summary.accountsSynced} synced — ${summary.recordsCreated} new, ${summary.recordsUpdated} metrics updated, ${summary.recordsFailed} failed.`
      );
    });
  }

  if (connectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <button type="button" className="btn-secondary" disabled={pending} onClick={syncAll}>
        {pending ? "Syncing…" : `Sync all connected accounts (${connectedCount})`}
      </button>
      {message ? <span className="text-xs text-ink-soft">{message}</span> : null}
    </div>
  );
}
