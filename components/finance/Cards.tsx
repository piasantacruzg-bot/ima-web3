"use client";

import { useState } from "react";
import { useFinance } from "@/lib/finance/store";
import { SUBSCRIPTIONS } from "@/lib/finance/data";
import { money, relativeDue, shortDate } from "@/lib/finance/format";
import { AccountCard } from "./AccountCard";
import { SectionHeader, haptic } from "./ui";

export function Cards({ onTransfer }: { onTransfer: (fromId?: string) => void }) {
  const { accounts, transactions } = useFinance();
  const wallets = accounts.filter((a) => a.type !== "credit");
  const cards = accounts.filter((a) => a.type === "credit");

  return (
    <div className="space-y-6 px-5 pb-32">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Cards & accounts</h1>
        <p className="text-sm text-muted">Tap any card to expand.</p>
      </div>

      {/* Stacked wallet visual */}
      <section>
        <div className="relative" style={{ height: 210 }}>
          {[...cards, ...wallets].slice(0, 4).map((a, i) => (
            <div
              key={a.id}
              className="press absolute inset-x-0 overflow-hidden rounded-4xl p-5 text-white shadow-float"
              style={{
                top: i * 46,
                zIndex: i,
                backgroundImage: `linear-gradient(135deg, ${a.gradient[0]}, ${a.gradient[1]})`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{a.emoji} {a.name}</span>
                <span className="text-[11px] text-white/70">{a.currency}</span>
              </div>
              <div className="mt-6 flex items-end justify-between">
                <div>
                  <div className="text-[10px] text-white/60">
                    {a.type === "credit" ? "Balance owed" : "Available"}
                  </div>
                  <div className="text-xl font-bold tnum">{money(Math.abs(a.balance), a.currency)}</div>
                </div>
                {a.last4 && <div className="text-sm tracking-widest text-white/80">·· {a.last4}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="All accounts" />
        <div className="stagger space-y-3">
          {accounts.map((a) => (
            <AccountCard key={a.id} account={a} transactions={transactions} onTransfer={(id) => onTransfer(id)} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Subscriptions" />
        <div className="card divide-y divide-line">
          {SUBSCRIPTIONS.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-canvas text-lg">{s.emoji}</span>
              <div className="flex-1">
                <div className="text-sm font-medium">{s.name}</div>
                <div className="text-[11px] text-faint">{s.cadence} · next {shortDate(s.nextChargeISO)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold tnum">{money(s.amount, s.currency)}</div>
                <div className="text-[11px] text-warning">{relativeDue(s.nextChargeISO)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <DataPanel />
    </div>
  );
}

// --- Google Drive + import/export/PDF -----------------------------

function DataPanel() {
  const { driveConnected, lastSyncedAt, syncStatus, pendingCount, userTransactions } = useFinance();
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (kind: "month" | "year" | "pdf", label: string) => {
    setBusy(label);
    try {
      const res = await fetch(`/api/export?type=${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ snapshot: userTransactions }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const now = new Date();
      const monthName = now.toLocaleString("en-US", { month: "long" });
      a.download =
        kind === "pdf"
          ? `Finance_Report_${monthName}_${now.getFullYear()}.pdf`
          : kind === "year"
          ? `${now.getFullYear()} Summary.xlsx`
          : `Finance_${monthName}_${now.getFullYear()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      haptic();
    } catch {
      alert("Export failed — please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section>
      <SectionHeader title="Data & Google Drive" />
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-canvas text-xl">
            {driveConnected ? "✅" : "☁️"}
          </span>
          <div className="flex-1">
            <div className="text-sm font-semibold">
              {driveConnected ? "Google Drive connected" : "Connect Google Drive"}
            </div>
            <div className="text-[11px] text-muted">
              {driveConnected
                ? `Monthly workbooks · ${lastSyncedAt ? "synced " + new Date(lastSyncedAt).toLocaleTimeString() : "ready"}`
                : "Store monthly Excel workbooks in your Drive folder."}
            </div>
          </div>
          {!driveConnected && (
            <a
              href="/api/auth/google"
              className="press gradient-brand rounded-full px-4 py-2 text-xs font-semibold text-white"
            >
              Connect
            </a>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-canvas/60 px-3 py-2 text-xs">
          <span className="text-muted">Sync status</span>
          <span className="flex items-center gap-1.5 font-medium">
            {syncStatus === "synced" && <><span className="text-positive">🟢</span> Synced</>}
            {syncStatus === "pending" && <><span>🟡</span> Pending {pendingCount}</>}
            {syncStatus === "error" && <><span>🔴</span> Error — retrying</>}
            {syncStatus === "offline" && <><span>⚪</span> Offline — queued</>}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <ExportBtn label="This month" emoji="📄" busy={busy === "This month"} onClick={() => download("month", "This month")} />
          <ExportBtn label="This year" emoji="📚" busy={busy === "This year"} onClick={() => download("year", "This year")} />
          <ExportBtn label="PDF report" emoji="🧾" busy={busy === "PDF report"} onClick={() => download("pdf", "PDF report")} />
        </div>

        <label className="press mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-2.5 text-xs font-medium text-muted">
          ⬆️ Import an existing Excel file
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={() => haptic()} />
        </label>

        <p className="mt-3 text-center text-[10px] leading-relaxed text-faint">
          Backups run every Sunday with full version history. Transactions carry unique IDs and never duplicate.
        </p>
      </div>
    </section>
  );
}

function ExportBtn({
  label,
  emoji,
  busy,
  onClick,
}: {
  label: string;
  emoji: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="press flex flex-col items-center gap-1 rounded-2xl border border-line py-3 text-[11px] font-medium disabled:opacity-50"
    >
      <span className="text-lg">{busy ? "⏳" : emoji}</span>
      {label}
    </button>
  );
}
