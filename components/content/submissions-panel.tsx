"use client";

import { useState, useTransition } from "react";
import { submitContent, reviewContentSubmission } from "@/app/(app)/content/actions";
import { formatDateTime } from "@/lib/format";
import type { ContentSubmission, SubmissionApprovalStatus } from "@/types/database";

const STATUS_LABEL: Record<SubmissionApprovalStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  revision_requested: "Revision requested",
  rejected: "Rejected",
};

const STATUS_STYLE: Record<SubmissionApprovalStatus, string> = {
  pending: "border-status-warning/30 text-status-warning",
  approved: "border-status-success/30 text-status-success",
  revision_requested: "border-status-danger/30 text-status-danger",
  rejected: "border-status-danger/30 text-status-danger",
};

// Every version stays visible — a new submission never replaces or
// deletes an older one (spec section 19).
export function SubmissionsPanel({
  deliverableId,
  storyInstanceId,
  submissions,
}: {
  deliverableId: string;
  storyInstanceId?: string;
  submissions: ContentSubmission[];
}) {
  const [contentUrl, setContentUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submitNewVersion() {
    setError(null);
    startTransition(async () => {
      const res = await submitContent({
        deliverableId,
        storyInstanceId,
        contentUrl: contentUrl || undefined,
        caption: caption || undefined,
      });
      if ("error" in res) setError(res.error);
      else {
        setContentUrl("");
        setCaption("");
      }
    });
  }

  return (
    <div className="space-y-3">
      {submissions.length === 0 ? (
        <p className="text-xs text-ink-soft">No submissions yet.</p>
      ) : (
        <ul className="space-y-2">
          {submissions.map((s) => (
            <li key={s.id} className="rounded-sm border border-line p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">Version {s.version_number}</span>
                <span className={`badge ${STATUS_STYLE[s.approval_status]}`}>{STATUS_LABEL[s.approval_status]}</span>
              </div>
              {s.content_url ? (
                <a href={s.content_url} target="_blank" rel="noreferrer" className="mt-1 block underline text-ink-soft">
                  {s.content_url}
                </a>
              ) : null}
              {s.caption ? <p className="mt-1 text-ink-soft">{s.caption}</p> : null}
              <p className="mt-1 text-ink-soft">Submitted {formatDateTime(s.submitted_at)}</p>
              {s.approval_status === "pending" ? <ReviewButtons submissionId={s.id} /> : null}
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-line pt-2">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">Submit a new version</p>
        <div className="flex flex-wrap items-end gap-2">
          <input className="input min-w-[200px] flex-1" placeholder="Draft/content URL (optional)" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} />
          <input className="input min-w-[160px] flex-1" placeholder="Caption / notes (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
          <button type="button" className="btn-secondary py-1.5" disabled={pending} onClick={submitNewVersion}>
            {pending ? "Submitting…" : "Submit for review"}
          </button>
        </div>
        {error ? <p className="mt-1 text-xs text-status-danger">{error}</p> : null}
      </div>
    </div>
  );
}

function ReviewButtons({ submissionId }: { submissionId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function decide(decision: SubmissionApprovalStatus) {
    setError(null);
    startTransition(async () => {
      const res = await reviewContentSubmission(submissionId, decision);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <button type="button" className="btn-secondary py-1" disabled={pending} onClick={() => decide("approved")}>
        Approve
      </button>
      <button type="button" className="btn-secondary py-1" disabled={pending} onClick={() => decide("revision_requested")}>
        Request revision
      </button>
      {error ? <span className="text-xs text-status-danger">{error}</span> : null}
    </div>
  );
}
