import { NextResponse } from "next/server";
import { ACCOUNTS, TRANSACTIONS, NOW } from "@/lib/finance/data";
import { liveAccounts } from "@/lib/finance/compute";
import {
  buildMonthlyWorkbook,
  buildYearlyWorkbook,
  workbookToBuffer,
} from "@/lib/finance/excel";
import {
  isDriveConnected,
  createWeeklyBackup,
  syncDashboardWorkbook,
} from "@/lib/finance/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Weekly backup + dashboard refresh. Intended to run every Sunday via
// a scheduled cron (see vercel.json). Also refreshes the Annual Summary.
export async function GET(req: Request) {
  // Simple shared-secret guard for the cron trigger.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (!isDriveConnected()) {
    return NextResponse.json({ ok: false, connected: false, note: "Drive not connected." });
  }

  try {
    const year = NOW.getUTCFullYear();
    const month = NOW.getUTCMonth();
    const transactions = [...TRANSACTIONS];
    const accounts = liveAccounts(ACCOUNTS, []);
    const stamp = new Date().toISOString();

    const monthWb = await buildMonthlyWorkbook(year, month, transactions, accounts);
    const monthBuf = await workbookToBuffer(monthWb);
    const backup = await createWeeklyBackup(year, month, monthBuf, stamp);

    const yearWb = await buildYearlyWorkbook(year, transactions, accounts);
    const yearBuf = await workbookToBuffer(yearWb);
    const annual = await syncDashboardWorkbook("Annual Summary.xlsx", yearBuf);

    return NextResponse.json({
      ok: true,
      connected: true,
      backedUpAt: stamp,
      backupFileId: backup.fileId,
      annualFileId: annual.fileId,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}
