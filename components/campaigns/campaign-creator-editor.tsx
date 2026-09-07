"use client";

import { useState } from "react";
import {
  updateCampaignCreatorFee,
  updateCampaignCreatorNotes,
  updateCampaignCreatorStatus,
} from "@/app/(app)/campaigns/actions";
import type { CampaignCreator, CampaignCreatorStatus } from "@/types/database";

const PIPELINE_STATUSES: CampaignCreatorStatus[] = [
  "suggested",
  "shortlisted",
  "contacted",
  "negotiating",
  "approved",
  "contracted",
  "active",
  "completed",
  "declined",
  "not_available",
  "removed",
];

export function CampaignCreatorEditor({
  campaignId,
  creatorId,
  campaignCreator,
}: {
  campaignId: string;
  creatorId: string;
  campaignCreator: CampaignCreator;
}) {
  const [status, setStatus] = useState(campaignCreator.status);
  const [proposedFee, setProposedFee] = useState(campaignCreator.proposed_fee?.toString() ?? "");
  const [negotiatedFee, setNegotiatedFee] = useState(campaignCreator.negotiated_fee?.toString() ?? "");
  const [approvedFee, setApprovedFee] = useState(campaignCreator.approved_fee?.toString() ?? "");
  const [currency, setCurrency] = useState(campaignCreator.currency ?? "USD");
  const [notes, setNotes] = useState(campaignCreator.notes ?? "");
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Pipeline status</label>
        <select
          className="input w-auto"
          value={status}
          onChange={async (e) => {
            const next = e.target.value as CampaignCreatorStatus;
            setStatus(next);
            await updateCampaignCreatorStatus(campaignId, creatorId, next);
          }}
        >
          {PIPELINE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Proposed fee</label>
          <input type="number" className="input" value={proposedFee} onChange={(e) => setProposedFee(e.target.value)} />
        </div>
        <div>
          <label className="label">Negotiated fee</label>
          <input type="number" className="input" value={negotiatedFee} onChange={(e) => setNegotiatedFee(e.target.value)} />
        </div>
        <div>
          <label className="label">Approved fee</label>
          <input type="number" className="input" value={approvedFee} onChange={(e) => setApprovedFee(e.target.value)} />
        </div>
        <div>
          <label className="label">Currency</label>
          <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </div>
      </div>
      <button
        type="button"
        className="btn-secondary"
        onClick={async () => {
          await updateCampaignCreatorFee(campaignId, creatorId, {
            proposedFee: proposedFee ? Number(proposedFee) : null,
            negotiatedFee: negotiatedFee ? Number(negotiatedFee) : null,
            approvedFee: approvedFee ? Number(approvedFee) : null,
            currency: currency || null,
            feeType: campaignCreator.fee_type,
          });
          setSaved("fee");
        }}
      >
        {saved === "fee" ? "Fees saved" : "Save fees"}
      </button>

      <div>
        <label className="label">Campaign-specific notes (only for this campaign)</label>
        <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button
          type="button"
          className="btn-secondary mt-2"
          onClick={async () => {
            await updateCampaignCreatorNotes(campaignId, creatorId, notes);
            setSaved("notes");
          }}
        >
          {saved === "notes" ? "Notes saved" : "Save notes"}
        </button>
      </div>
    </div>
  );
}
