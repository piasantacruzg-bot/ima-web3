"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
import { CreatorCard } from "@/components/campaigns/creator-card";
import type { CreatorCardData } from "@/components/campaigns/creator-card-data";
import {
  shortlistCampaignCreator,
  selectCampaignCreator,
  rejectCampaignCreator,
  removeCampaignCreator,
  updateCampaignCreatorFee,
} from "@/app/(app)/campaigns/actions";
import { formatCompactNumber, formatCurrency, formatPercent } from "@/lib/format";

type Tab = "recommended" | "shortlisted" | "selected" | "rejected";

export function CreatorSelectionWorkspace({
  campaignId,
  recommended,
  shortlisted,
  selected,
  rejected,
}: {
  campaignId: string;
  recommended: CreatorCardData[];
  shortlisted: CreatorCardData[];
  selected: CreatorCardData[];
  rejected: CreatorCardData[];
}) {
  const [tab, setTab] = useState<Tab>("recommended");
  const [view, setView] = useState<"card" | "table">("card");
  const [search, setSearch] = useState("");
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const tabData: Record<Tab, CreatorCardData[]> = { recommended, shortlisted, selected, rejected };
  const rows = tabData[tab].filter((r) => r.displayName.toLowerCase().includes(search.toLowerCase()));
  const compareRows = useMemo(() => {
    const allCards = [...recommended, ...shortlisted, ...selected, ...rejected];
    return allCards.filter((c) => compareIds.has(c.creatorId));
  }, [recommended, shortlisted, selected, rejected, compareIds]);

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      return next;
    });
  }

  async function withPending(id: string, fn: () => Promise<unknown>) {
    setPending((p) => new Set(p).add(id));
    try {
      await fn();
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(id);
        return next;
      });
    }
  }

  function matchInfoFor(r: CreatorCardData) {
    return r.matchScore !== null ? { score: r.matchScore, breakdown: {}, reasons: r.matchReasons } : undefined;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <TabButton label={`Recommended (${recommended.length})`} active={tab === "recommended"} onClick={() => setTab("recommended")} />
          <TabButton label={`Shortlisted (${shortlisted.length})`} active={tab === "shortlisted"} onClick={() => setTab("shortlisted")} />
          <TabButton label={`Selected (${selected.length})`} active={tab === "selected"} onClick={() => setTab("selected")} />
          <TabButton label={`Rejected (${rejected.length})`} active={tab === "rejected"} onClick={() => setTab("rejected")} />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-48"
          />
          <button type="button" className="btn-secondary px-2 py-1.5" onClick={() => setView(view === "card" ? "table" : "card")}>
            {view === "card" ? <TableIcon size={15} strokeWidth={1.75} /> : <LayoutGrid size={15} strokeWidth={1.75} />}
          </button>
          {compareIds.size >= 2 ? (
            <button type="button" className="btn-primary" onClick={() => setShowCompare(true)}>
              Compare ({compareIds.size})
            </button>
          ) : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="card p-6 text-sm text-ink-soft">No creators in this view.</p>
      ) : view === "card" ? (
        <div className="grid grid-cols-3 gap-4">
          {rows.map((r) => (
            <CreatorCard
              key={r.creatorId}
              data={r}
              campaignId={campaignId}
              selected={compareIds.has(r.creatorId)}
              onToggleCompare={() => toggleCompare(r.creatorId)}
            >
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-2">
                {tab === "recommended" && (
                  <>
                    <ActionButton
                      label="Shortlist"
                      disabled={pending.has(r.creatorId)}
                      onClick={() => withPending(r.creatorId, () => shortlistCampaignCreator(campaignId, r.creatorId, matchInfoFor(r)))}
                    />
                    <ActionButton
                      label="Select"
                      primary
                      disabled={pending.has(r.creatorId)}
                      onClick={() => withPending(r.creatorId, () => selectCampaignCreator(campaignId, r.creatorId, matchInfoFor(r)))}
                    />
                    <ActionButton
                      label="Reject"
                      danger
                      disabled={pending.has(r.creatorId)}
                      onClick={() => withPending(r.creatorId, () => rejectCampaignCreator(campaignId, r.creatorId, matchInfoFor(r)))}
                    />
                  </>
                )}
                {tab === "shortlisted" && (
                  <>
                    <ActionButton
                      label="Select"
                      primary
                      disabled={pending.has(r.creatorId)}
                      onClick={() => withPending(r.creatorId, () => selectCampaignCreator(campaignId, r.creatorId))}
                    />
                    <ActionButton
                      label="Remove"
                      danger
                      disabled={pending.has(r.creatorId)}
                      onClick={() => withPending(r.creatorId, () => removeCampaignCreator(campaignId, r.creatorId))}
                    />
                  </>
                )}
                {tab === "selected" && (
                  <>
                    <FeeInput campaignId={campaignId} data={r} />
                    <ActionButton
                      label="Remove"
                      danger
                      disabled={pending.has(r.creatorId)}
                      onClick={() => withPending(r.creatorId, () => removeCampaignCreator(campaignId, r.creatorId))}
                    />
                  </>
                )}
                {tab === "rejected" && (
                  <ActionButton
                    label="Reconsider (shortlist)"
                    disabled={pending.has(r.creatorId)}
                    onClick={() => withPending(r.creatorId, () => shortlistCampaignCreator(campaignId, r.creatorId))}
                  />
                )}
              </div>
            </CreatorCard>
          ))}
        </div>
      ) : (
        <TableView rows={rows} />
      )}

      {showCompare ? <CompareDrawer rows={compareRows} onClose={() => setShowCompare(false)} /> : null}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium ${
        active ? "border-ink bg-ink text-paper-raised" : "border-line text-ink-soft hover:border-ink/30"
      }`}
    >
      {label}
    </button>
  );
}

function ActionButton({
  label,
  onClick,
  primary,
  danger,
  disabled,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${primary ? "btn-primary" : "btn-secondary"} py-1 text-xs ${danger ? "text-status-danger" : ""}`}
    >
      {label}
    </button>
  );
}

function FeeInput({ campaignId, data }: { campaignId: string; data: CreatorCardData }) {
  const [value, setValue] = useState(data.proposedFee?.toString() ?? "");
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        placeholder="Fee"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        className="input w-20 py-1 text-xs"
      />
      <button
        type="button"
        className="btn-secondary py-1 text-xs"
        onClick={async () => {
          const fee = value ? Number(value) : null;
          await updateCampaignCreatorFee(campaignId, data.creatorId, {
            proposedFee: fee,
            negotiatedFee: data.negotiatedFee,
            approvedFee: data.approvedFee,
            currency: data.currency ?? "USD",
            feeType: null,
          });
          setSaved(true);
        }}
      >
        {saved ? "Saved" : "Save fee"}
      </button>
    </div>
  );
}

function TableView({ rows }: { rows: CreatorCardData[] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
            <th className="p-3">Creator</th>
            <th className="p-3">Match</th>
            <th className="p-3">Followers</th>
            <th className="p-3">Engagement</th>
            <th className="p-3">Brand fit</th>
            <th className="p-3">Fee</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.creatorId} className="border-b border-line last:border-0">
              <td className="p-3 font-medium text-ink">{r.displayName}</td>
              <td className="p-3">{r.matchScore !== null ? Math.round(r.matchScore) : "—"}</td>
              <td className="p-3">{formatCompactNumber(r.followers)}</td>
              <td className="p-3">{formatPercent(r.engagementRate)}</td>
              <td className="p-3">{r.brandFitScore ?? "—"}</td>
              <td className="p-3">{formatCurrency(r.proposedFee ?? r.negotiatedFee ?? r.approvedFee)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompareDrawer({ rows, onClose }: { rows: CreatorCardData[]; onClose: () => void }) {
  const metrics: { label: string; get: (r: CreatorCardData) => string; best?: "max" | "min" }[] = [
    { label: "Followers", get: (r) => formatCompactNumber(r.followers), best: "max" },
    { label: "Engagement", get: (r) => formatPercent(r.engagementRate), best: "max" },
    { label: "Avg. views", get: (r) => formatCompactNumber(r.averageViews), best: "max" },
    { label: "Brand fit", get: (r) => (r.brandFitScore !== null ? String(r.brandFitScore) : "—"), best: "max" },
    { label: "Rating", get: (r) => (r.internalRating !== null ? String(r.internalRating) : "—"), best: "max" },
    { label: "Campaigns", get: (r) => String(r.previousCampaignCount) },
    { label: "Avg. fee", get: (r) => formatCurrency(r.negotiatedFee ?? r.proposedFee) },
    { label: "Match score", get: (r) => (r.matchScore !== null ? String(Math.round(r.matchScore)) : "—"), best: "max" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" onClick={onClose}>
      <div className="card max-h-[80vh] w-full max-w-3xl overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg text-ink">Compare creators</h2>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="p-2">Metric</th>
              {rows.map((r) => (
                <th key={r.creatorId} className="p-2 text-ink">
                  {r.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => {
              const values = rows.map((r) => m.get(r));
              const numericValues = rows.map((r) => {
                const raw = m.get(r).replace(/[^0-9.-]/g, "");
                return raw ? Number(raw) : null;
              });
              const bestValue =
                m.best === "max"
                  ? Math.max(...numericValues.filter((v): v is number => v !== null))
                  : m.best === "min"
                    ? Math.min(...numericValues.filter((v): v is number => v !== null))
                    : null;
              return (
                <tr key={m.label} className="border-b border-line last:border-0">
                  <td className="p-2 text-ink-soft">{m.label}</td>
                  {rows.map((r, i) => (
                    <td
                      key={r.creatorId}
                      className={`p-2 ${bestValue !== null && numericValues[i] === bestValue ? "font-medium text-status-success" : "text-ink"}`}
                    >
                      {values[i]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
