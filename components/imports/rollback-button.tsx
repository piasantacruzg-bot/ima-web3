"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rollbackImportBatch } from "@/app/(app)/imports/actions";

export function RollbackButton({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setConfirming(true)}>
        Roll back this import
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-ink-soft">
          Archives creators this import created and restores updated fields to their pre-import values. Sure?
        </span>
        <button type="button" className="btn-secondary" onClick={() => setConfirming(false)} disabled={isPending}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await rollbackImportBatch(batchId);
              if (result.error) setError(result.error);
              else router.refresh();
            })
          }
        >
          {isPending ? "Rolling back…" : "Confirm rollback"}
        </button>
      </div>
      {error ? <p className="text-sm text-status-danger">{error}</p> : null}
    </div>
  );
}
