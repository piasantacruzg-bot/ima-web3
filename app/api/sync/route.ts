import { NextResponse } from "next/server";
import type { Transaction } from "@/lib/finance/types";
import { ACCOUNTS, TRANSACTIONS, NOW } from "@/lib/finance/data";
import { liveAccounts } from "@/lib/finance/compute";
import { buildMonthlyWorkbook, workbookToBuffer } from "@/lib/finance/excel";
import {
  isDriveConfigured,
  isDriveConnected,
  syncMonthlyWorkbook,
} from "@/lib/finance/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Report whether Drive is wired up (used on app load).
export async function GET() {
  return NextResponse.json({
    configured: isDriveConfigured(),
    connected: isDriveConnected(),
    lastSyncedAt: null,
  });
}

// Receive queued mutations + a snapshot of user transactions, then
// (re)build the affected monthly workbook and push it to Drive.
export async function POST(req: Request) {
  let body: { snapshot?: Transaction[]; mutations?: unknown[] } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }
  const userTx = Array.isArray(body.snapshot) ? body.snapshot : [];

  // If Drive isn't connected we still succeed — data lives locally.
  if (!isDriveConnected()) {
    return NextResponse.json({
      ok: true,
      connected: false,
      configured: isDriveConfigured(),
      syncedAt: new Date().toISOString(),
      note: "Saved locally. Connect Google Drive to enable workbook sync.",
    });
  }

  try {
    const transactions = [...userTx, ...TRANSACTIONS];
    const accounts = liveAccounts(ACCOUNTS, userTx);

    // Sync the current month (and any other months touched by the snapshot).
    const months = new Set<string>();
    months.add(`${NOW.getUTCFullYear()}-${NOW.getUTCMonth()}`);
    for (const t of userTx) {
      const d = new Date(t.dateISO);
      months.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}`);
    }

    const synced: string[] = [];
    for (const key of months) {
      const [y, m] = key.split("-").map(Number);
      const wb = await buildMonthlyWorkbook(y, m, transactions, accounts);
      const buf = await workbookToBuffer(wb);
      const { fileId } = await syncMonthlyWorkbook(y, m, buf);
      synced.push(fileId);
    }

    return NextResponse.json({
      ok: true,
      connected: true,
      syncedAt: new Date().toISOString(),
      files: synced,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message, connected: true },
      { status: 502 }
    );
  }
}
