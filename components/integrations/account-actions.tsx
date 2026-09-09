"use client";

import { useState, useTransition } from "react";
import { syncAccountNow, disconnectAccount } from "@/app/(app)/settings/integrations/actions";

export function AccountActions({ socialAccountId }: { socialAccountId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function syncNow() {
    setMessage(null);
    startTransition(async () => {
      const outcome = await syncAccountNow(socialAccountId);
      if (outcome.status === "failed") setMessage(outcome.errorMessage ?? "Sync failed.");
      else setMessage(`Synced: ${outcome.recordsCreated} new, ${outcome.recordsUpdated} updated, ${outcome.recordsSkipped} skipped.`);
    });
  }

  function disconnect() {
    setMessage(null);
    startTransition(async () => {
      await disconnectAccount(socialAccountId);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" className="btn-secondary py-1 text-xs" disabled={pending} onClick={syncNow}>
        {pending ? "Working…" : "Sync now"}
      </button>
      <button type="button" className="btn-secondary py-1 text-xs" disabled={pending} onClick={disconnect}>
        Disconnect
      </button>
      {message ? <span className="text-xs text-ink-soft">{message}</span> : null}
    </div>
  );
}
