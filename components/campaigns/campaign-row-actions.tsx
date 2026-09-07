"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw, Copy, MoreVertical } from "lucide-react";
import { archiveCampaign, restoreCampaign, duplicateCampaign } from "@/app/(app)/campaigns/actions";

export function CampaignRowActions({ campaignId, isArchived }: { campaignId: string; isArchived: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDuplicate(duplicateCreators: boolean) {
    startTransition(async () => {
      const result = await duplicateCampaign(campaignId, { duplicateCreators });
      setOpen(false);
      if ("campaignId" in result) router.push(`/campaigns/${result.campaignId}`);
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="btn-secondary px-2 py-1"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
      >
        <MoreVertical size={14} strokeWidth={1.75} />
      </button>
      {open ? (
        <div className="absolute right-0 z-10 mt-1 w-48 rounded-sm border border-line bg-paper-raised py-1 shadow-card">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-paper"
            onClick={() => handleDuplicate(false)}
          >
            <Copy size={13} strokeWidth={1.75} />
            Duplicate campaign
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-paper"
            onClick={() => handleDuplicate(true)}
          >
            <Copy size={13} strokeWidth={1.75} />
            Duplicate with creators
          </button>
          <div className="my-1 border-t border-line" />
          {isArchived ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-paper"
              onClick={() =>
                startTransition(async () => {
                  await restoreCampaign(campaignId);
                  setOpen(false);
                })
              }
            >
              <RotateCcw size={13} strokeWidth={1.75} />
              Restore
            </button>
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-status-danger hover:bg-paper"
              onClick={() =>
                startTransition(async () => {
                  await archiveCampaign(campaignId);
                  setOpen(false);
                })
              }
            >
              <Archive size={13} strokeWidth={1.75} />
              Archive
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
