"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { DuplicateCandidate } from "@/lib/duplicate-detection";
import { DuplicateWarningDialog } from "@/components/creators/duplicate-warning-dialog";

export function DuplicateCheckButton({
  creatorId,
  checkAction,
}: {
  creatorId: string;
  checkAction: (creatorId: string) => Promise<DuplicateCandidate[]>;
}) {
  const [candidates, setCandidates] = useState<DuplicateCandidate[] | null>(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const found = await checkAction(creatorId);
    setLoading(false);
    setChecked(true);
    setCandidates(found);
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={loading} className="btn-secondary">
        <ShieldCheck size={15} strokeWidth={1.75} />
        {loading ? "Checking…" : "Check duplicates"}
      </button>
      {checked && candidates && candidates.length === 0 ? (
        <p className="mt-1 text-xs text-status-success">No potential duplicates found.</p>
      ) : null}
      {candidates && candidates.length > 0 ? (
        <DuplicateWarningDialog
          candidates={candidates}
          mode="review"
          currentCreatorId={creatorId}
          onCancel={() => setCandidates(null)}
        />
      ) : null}
    </>
  );
}
