"use client";

import { useState } from "react";
import { useFinance } from "@/lib/finance/store";
import { NOW } from "@/lib/finance/data";
import { haptic } from "./ui";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const monthName = MONTH_NAMES[NOW.getUTCMonth()];
const year = NOW.getUTCFullYear();
const daysInMonth = new Date(Date.UTC(year, NOW.getUTCMonth() + 1, 0)).getUTCDate();
const daysLeft = daysInMonth - NOW.getUTCDate();
const nearMonthEnd = daysLeft <= 5;

type Kind = "month" | "year" | "pdf";

function useMonthExport() {
  const { userTransactions } = useFinance();
  const [busy, setBusy] = useState<Kind | null>(null);

  const download = async (kind: Kind) => {
    setBusy(kind);
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
      a.download =
        kind === "pdf"
          ? `Finance_Report_${monthName}_${year}.pdf`
          : kind === "year"
          ? `${year} Summary.xlsx`
          : `Finance_${monthName}_${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      haptic();
    } catch {
      alert("Export failed — please try again.");
    } finally {
      setBusy(null);
    }
  };

  return { busy, download };
}

// End-of-month prompt shown on Home. Gains emphasis in the last days
// of the month, but the export options are always available.
export function MonthlyExportCard() {
  const { download, busy } = useMonthExport();
  return (
    <div
      className={`card overflow-hidden p-5 ${
        nearMonthEnd ? "border-brand/40 shadow-glow" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">📆</span>
            <h3 className="text-sm font-semibold">Export {monthName} {year}</h3>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {nearMonthEnd
              ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left this month — download your workbook whenever you're ready.`
              : "Download this month's workbook or a PDF report anytime. Nothing is uploaded automatically."}
          </p>
        </div>
        {nearMonthEnd && (
          <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand-light">
            Month-end
          </span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => download("month")}
          disabled={busy === "month"}
          className="press gradient-brand flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === "month" ? "⏳ Preparing…" : "📄 Export Excel"}
        </button>
        <button
          onClick={() => download("pdf")}
          disabled={busy === "pdf"}
          className="press flex items-center justify-center gap-2 rounded-2xl border border-line py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {busy === "pdf" ? "⏳ Preparing…" : "🧾 PDF report"}
        </button>
      </div>
    </div>
  );
}

// Full data + Drive panel used on the Cards screen.
export function DataPanel() {
  const { driveConnected, lastExportedAt, saveStatus, exportMonthToDrive } = useFinance();
  const { download, busy } = useMonthExport();
  const [savingDrive, setSavingDrive] = useState(false);
  const [driveMsg, setDriveMsg] = useState<string | null>(null);

  const saveToDrive = async () => {
    setSavingDrive(true);
    setDriveMsg(null);
    haptic();
    const { ok, connected } = await exportMonthToDrive();
    setDriveMsg(
      ok && connected
        ? `Saved ${monthName} ${year} to Google Drive.`
        : ok
        ? "Drive not connected — file wasn't uploaded."
        : "Couldn't reach Google Drive. Try again."
    );
    setSavingDrive(false);
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-[15px] font-semibold tracking-tight">Export & Google Drive</h2>
        <span className="text-[11px] text-faint">{saveStatus === "saving" ? "Saving…" : "Saved locally"}</span>
      </div>
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-canvas text-xl">
            {driveConnected ? "✅" : "☁️"}
          </span>
          <div className="flex-1">
            <div className="text-sm font-semibold">
              {driveConnected ? "Google Drive connected" : "Google Drive (optional)"}
            </div>
            <div className="text-[11px] text-muted">
              {driveConnected
                ? lastExportedAt
                  ? `Last saved ${new Date(lastExportedAt).toLocaleString()}`
                  : "Save this month's workbook when you're ready."
                : "Connect to save monthly workbooks straight to your Drive folder."}
            </div>
          </div>
          {driveConnected ? (
            <button
              onClick={saveToDrive}
              disabled={savingDrive}
              className="press gradient-brand rounded-full px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {savingDrive ? "Saving…" : "Save month"}
            </button>
          ) : (
            <a
              href="/api/auth/google"
              className="press rounded-full border border-line px-4 py-2 text-xs font-semibold"
            >
              Connect
            </a>
          )}
        </div>

        {driveMsg && (
          <div className="mt-3 rounded-2xl bg-canvas/60 px-3 py-2 text-[11px] text-muted">{driveMsg}</div>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2">
          <ExportBtn label="This month" emoji="📄" busy={busy === "month"} onClick={() => download("month")} />
          <ExportBtn label="This year" emoji="📚" busy={busy === "year"} onClick={() => download("year")} />
          <ExportBtn label="PDF report" emoji="🧾" busy={busy === "pdf"} onClick={() => download("pdf")} />
        </div>

        <label className="press mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-2.5 text-xs font-medium text-muted">
          ⬆️ Import an existing Excel file
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={() => haptic()} />
        </label>

        <p className="mt-3 text-center text-[10px] leading-relaxed text-faint">
          Your data stays on this device until you export it. Each transaction has a unique ID and never duplicates.
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
