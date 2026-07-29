import type { Transaction } from "@/lib/finance/types";
import { ACCOUNTS, TRANSACTIONS, NOW, CATEGORIES } from "@/lib/finance/data";
import { liveAccounts } from "@/lib/finance/compute";
import { convert } from "@/lib/finance/format";
import {
  buildMonthlyWorkbook,
  buildYearlyWorkbook,
  workbookToBuffer,
  monthFileName,
} from "@/lib/finance/excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function resolveState(req: Request): Promise<{ transactions: Transaction[]; accounts: ReturnType<typeof liveAccounts> }> {
  let userTx: Transaction[] = [];
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (Array.isArray(body?.snapshot)) userTx = body.snapshot;
    } catch {
      /* ignore */
    }
  }
  return {
    transactions: [...userTx, ...TRANSACTIONS],
    accounts: liveAccounts(ACCOUNTS, userTx),
  };
}

async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "month";
  const { transactions, accounts } = await resolveState(req);
  const year = NOW.getUTCFullYear();
  const month = NOW.getUTCMonth();

  if (type === "pdf") {
    const buf = await buildPdf(transactions, accounts, year, month);
    return new Response(new Uint8Array(buf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="Finance_Report_${year}_${month + 1}.pdf"`,
      },
    });
  }

  if (type === "year") {
    const wb = await buildYearlyWorkbook(year, transactions, accounts);
    const buf = await workbookToBuffer(wb);
    return xlsxResponse(buf, `${year} Summary.xlsx`);
  }

  const wb = await buildMonthlyWorkbook(year, month, transactions, accounts);
  const buf = await workbookToBuffer(wb);
  return xlsxResponse(buf, monthFileName(year, month));
}

export const GET = handle;
export const POST = handle;

function xlsxResponse(buf: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": XLSX_MIME,
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}

const toUSD = (a: number, c: "USD" | "PEN") => convert(a, c, "USD");

async function buildPdf(
  transactions: Transaction[],
  accounts: ReturnType<typeof liveAccounts>,
  year: number,
  month: number
): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const monthName = new Date(Date.UTC(year, month, 1)).toLocaleString("en-US", { month: "long" });

  // Header band
  doc.setFillColor(124, 92, 255);
  doc.rect(0, 0, 595, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("Financial Report", 40, 45);
  doc.setFontSize(12);
  doc.text(`${monthName} ${year}`, 40, 66);

  const monthly = transactions.filter((t) => {
    const d = new Date(t.dateISO);
    return d.getUTCFullYear() === year && d.getUTCMonth() === month;
  });
  const income = monthly.filter((t) => t.amount > 0 && t.category !== "transfer").reduce((s, t) => s + toUSD(t.amount, t.currency), 0);
  const expense = monthly.filter((t) => t.amount < 0 && t.category !== "transfer").reduce((s, t) => s + toUSD(Math.abs(t.amount), t.currency), 0);
  const assets = accounts.filter((a) => a.balance > 0).reduce((s, a) => s + toUSD(a.balance, a.currency), 0);
  const debt = accounts.filter((a) => a.balance < 0).reduce((s, a) => s + toUSD(Math.abs(a.balance), a.currency), 0);

  doc.setTextColor(30, 30, 40);
  doc.setFontSize(13);
  doc.text("Summary", 40, 125);
  autoTable(doc, {
    startY: 135,
    head: [["Metric", "Amount (USD)"]],
    body: [
      ["Total Income", `$${income.toFixed(2)}`],
      ["Total Expenses", `$${expense.toFixed(2)}`],
      ["Net Cash Flow", `$${(income - expense).toFixed(2)}`],
      ["Net Worth", `$${(assets - debt).toFixed(2)}`],
      ["Total Debt", `$${debt.toFixed(2)}`],
    ],
    headStyles: { fillColor: [124, 92, 255] },
    theme: "striped",
    margin: { left: 40, right: 40 },
  });

  const afterSummary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  doc.text("Accounts", 40, afterSummary);
  autoTable(doc, {
    startY: afterSummary + 10,
    head: [["Account", "Currency", "Balance (USD)"]],
    body: accounts.map((a) => [a.name, a.currency, `$${toUSD(a.balance, a.currency).toFixed(2)}`]),
    headStyles: { fillColor: [91, 141, 239] },
    theme: "striped",
    margin: { left: 40, right: 40 },
  });

  const afterAccts = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  doc.text("Transactions", 40, afterAccts);
  autoTable(doc, {
    startY: afterAccts + 10,
    head: [["Date", "Description", "Category", "Amount"]],
    body: monthly
      .slice()
      .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())
      .map((t) => [
        new Date(t.dateISO).toISOString().slice(0, 10),
        t.merchant,
        CATEGORIES[t.category]?.label ?? t.category,
        `${t.amount >= 0 ? "+" : "-"}${Math.abs(t.amount).toFixed(2)} ${t.currency}`,
      ]),
    headStyles: { fillColor: [52, 211, 153] },
    theme: "striped",
    styles: { fontSize: 9 },
    margin: { left: 40, right: 40 },
  });

  return Buffer.from(doc.output("arraybuffer"));
}
