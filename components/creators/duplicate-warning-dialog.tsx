"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { DuplicateCandidate } from "@/lib/duplicate-detection";

export function DuplicateWarningDialog({
  candidates,
  onKeepSeparate,
  onCancel,
  mode = "form",
  currentCreatorId,
}: {
  candidates: DuplicateCandidate[];
  onCancel: () => void;
  onKeepSeparate?: () => void;
  mode?: "form" | "review";
  currentCreatorId?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="card max-h-[80vh] w-full max-w-lg overflow-y-auto p-6">
        <div className="mb-4 flex items-center gap-2 text-status-warning">
          <AlertTriangle size={18} strokeWidth={1.75} />
          <h2 className="text-sm font-medium uppercase tracking-wide">Possible duplicate</h2>
        </div>
        <div className="space-y-3">
          {candidates.map((c) => (
            <div key={c.creator.id} className="rounded-sm border border-line p-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="font-medium text-ink">{c.creator.display_name}</p>
                <span
                  className={`badge ${
                    c.matchType === "exact"
                      ? "border-status-danger/30 text-status-danger"
                      : "border-status-warning/30 text-status-warning"
                  }`}
                >
                  {c.matchType === "exact" ? "Exact match" : "Possible match"}
                </span>
              </div>
              <ul className="mb-2 list-inside list-disc text-xs text-ink-soft">
                {c.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              <div className="flex items-center gap-3">
                <Link
                  href={`/creators/${c.creator.id}`}
                  target="_blank"
                  className="text-xs text-ink underline"
                >
                  View existing profile
                </Link>
                {mode === "review" && currentCreatorId ? (
                  <Link
                    href={`/creators/merge?a=${currentCreatorId}&b=${c.creator.id}`}
                    className="text-xs text-status-info underline"
                  >
                    Merge
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">
            {mode === "review" ? "Close" : "Cancel"}
          </button>
          {mode === "form" ? (
            <button type="button" onClick={onKeepSeparate} className="btn-primary">
              Keep separate &amp; save
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
