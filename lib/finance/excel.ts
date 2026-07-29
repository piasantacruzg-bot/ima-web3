import ExcelJS from "exceljs";
import type { Account, Transaction } from "./types";
import { CATEGORIES } from "./data";
import { convert } from "./format";

// ============================================================
// Monthly & yearly Excel workbook generation.
// Structure matches the product spec exactly.
// ============================================================

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthFileName(year: number, monthIndex0: number): string {
  return `Finance_${MONTH_NAMES[monthIndex0]}_${year}.xlsx`;
}
export function monthFolderName(monthIndex0: number): string {
  return `${String(monthIndex0 + 1).padStart(2, "0")} - ${MONTH_NAMES[monthIndex0]}`;
}

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF7C5CFF" },
};
const SUBHEAD_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEDEBFF" },
};

function styleHeader(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = { bottom: { style: "thin", color: { argb: "FFD9D5FF" } } };
  });
}

function titleRow(ws: ExcelJS.Worksheet, text: string, span = 6) {
  const r = ws.addRow([text]);
  r.font = { bold: true, size: 16, color: { argb: "FF2A2140" } };
  r.height = 26;
  ws.mergeCells(r.number, 1, r.number, span);
  ws.addRow([]);
}

const toUSD = (a: number, c: "USD" | "PEN") => convert(a, c, "USD");
const isIncome = (t: Transaction) => t.amount > 0 && t.category !== "transfer";
const isExpense = (t: Transaction) => t.amount < 0 && t.category !== "transfer";
const isTransfer = (t: Transaction) => t.category === "transfer";

function subLabel(t: Transaction): string {
  return CATEGORIES[t.category]?.label ?? t.category;
}

// --- Monthly workbook ---------------------------------------------

export async function buildMonthlyWorkbook(
  year: number,
  monthIndex0: number,
  transactions: Transaction[],
  accounts: Account[]
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "My Money";
  wb.created = new Date(Date.UTC(year, monthIndex0, 1));

  const monthly = transactions.filter((t) => {
    const d = new Date(t.dateISO);
    return d.getUTCFullYear() === year && d.getUTCMonth() === monthIndex0;
  });

  buildDashboardSheet(wb, year, monthIndex0, monthly, accounts);
  buildTransactionsSheet(wb, monthly, accounts);
  buildTypeSheet(wb, "Income", monthly.filter(isIncome), accounts);
  buildTypeSheet(wb, "Expenses", monthly.filter(isExpense), accounts);
  buildTransfersSheet(wb, monthly.filter(isTransfer), accounts);
  buildAccountsSheet(wb, accounts);
  buildBudgetsSheet(wb, monthly);
  buildGoalsSheet(wb);
  buildMonthlySummarySheet(wb, monthly, accounts);
  buildChartsSheet(wb, monthly);

  return wb;
}

function buildDashboardSheet(
  wb: ExcelJS.Workbook,
  year: number,
  monthIndex0: number,
  monthly: Transaction[],
  accounts: Account[]
) {
  const ws = wb.addWorksheet("Dashboard", { properties: { tabColor: { argb: "FF7C5CFF" } } });
  ws.columns = [{ width: 28 }, { width: 20 }, { width: 20 }, { width: 20 }];
  titleRow(ws, `${MONTH_NAMES[monthIndex0]} ${year} · Financial Overview`, 4);

  const income = monthly.filter(isIncome).reduce((s, t) => s + toUSD(t.amount, t.currency), 0);
  const expense = monthly.filter(isExpense).reduce((s, t) => s + toUSD(Math.abs(t.amount), t.currency), 0);
  const assets = accounts.filter((a) => a.balance > 0).reduce((s, a) => s + toUSD(a.balance, a.currency), 0);
  const debt = accounts.filter((a) => a.balance < 0).reduce((s, a) => s + toUSD(Math.abs(a.balance), a.currency), 0);

  const kpis: [string, number][] = [
    ["Total Income", income],
    ["Total Expenses", expense],
    ["Net Cash Flow", income - expense],
    ["Savings", income - expense],
    ["Net Worth", assets - debt],
    ["Cash Available", assets],
    ["Total Debt", debt],
  ];
  const hdr = ws.addRow(["Metric", "Amount (USD)"]);
  styleHeader(hdr);
  for (const [k, v] of kpis) {
    const r = ws.addRow([k, v]);
    r.getCell(2).numFmt = '"$"#,##0.00';
    r.getCell(1).font = { bold: true };
  }
}

function buildTransactionsSheet(
  wb: ExcelJS.Workbook,
  monthly: Transaction[],
  accounts: Account[]
) {
  const ws = wb.addWorksheet("Transactions");
  ws.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Time", key: "time", width: 8 },
    { header: "Description", key: "desc", width: 26 },
    { header: "Income / Expense / Transfer", key: "type", width: 16 },
    { header: "Category", key: "cat", width: 16 },
    { header: "Subcategory", key: "sub", width: 16 },
    { header: "Account", key: "acct", width: 18 },
    { header: "Destination Account", key: "dest", width: 18 },
    { header: "Currency", key: "cur", width: 9 },
    { header: "Amount", key: "amt", width: 12 },
    { header: "Transfer Fee", key: "fee", width: 12 },
    { header: "Exchange Rate", key: "fx", width: 12 },
    { header: "Notes", key: "notes", width: 22 },
    { header: "Tags", key: "tags", width: 14 },
    { header: "Receipt Link", key: "receipt", width: 16 },
    { header: "Running Balance", key: "bal", width: 15 },
  ];
  styleHeader(ws.getRow(1));
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const acctName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  const sorted = [...monthly].sort(
    (a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime()
  );

  for (const t of sorted) {
    const d = new Date(t.dateISO);
    const type = isIncome(t) ? "Income" : isTransfer(t) ? "Transfer" : "Expense";
    const dest = t.merchant.startsWith("Transfer to ") ? t.merchant.replace("Transfer to ", "") : "";
    const row = ws.addRow({
      date: d.toISOString().slice(0, 10),
      time: d.toISOString().slice(11, 16),
      desc: t.merchant,
      type,
      cat: CATEGORIES[t.category]?.label ?? t.category,
      sub: subLabel(t),
      acct: acctName(t.accountId),
      dest,
      cur: t.currency,
      amt: t.amount,
      fee: 0,
      fx: t.currency === "USD" ? 1 : 3.641,
      notes: t.note ?? "",
      tags: t.recurring ? "recurring" : "",
      receipt: "",
      bal: t.balanceAfter,
    });
    row.getCell("amt").numFmt = '#,##0.00';
    row.getCell("bal").numFmt = '#,##0.00';
    row.getCell("amt").font = { color: { argb: t.amount >= 0 ? "FF17864B" : "FFB01B3C" } };
  }
}

function buildTypeSheet(
  wb: ExcelJS.Workbook,
  name: "Income" | "Expenses",
  items: Transaction[],
  accounts: Account[]
) {
  const ws = wb.addWorksheet(name);
  ws.columns = [
    { width: 12 }, { width: 26 }, { width: 16 }, { width: 18 }, { width: 10 }, { width: 12 },
  ];
  const hdr = ws.addRow(["Date", "Description", "Category", "Account", "Currency", "Amount"]);
  styleHeader(hdr);
  const acctName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  for (const t of items) {
    const r = ws.addRow([
      new Date(t.dateISO).toISOString().slice(0, 10),
      t.merchant,
      CATEGORIES[t.category]?.label ?? t.category,
      acctName(t.accountId),
      t.currency,
      Math.abs(t.amount),
    ]);
    r.getCell(6).numFmt = '#,##0.00';
  }
  const total = items.reduce((s, t) => s + toUSD(Math.abs(t.amount), t.currency), 0);
  ws.addRow([]);
  const tr = ws.addRow(["", "", "", "", "Total (USD)", total]);
  tr.font = { bold: true };
  tr.getCell(6).numFmt = '"$"#,##0.00';
}

function buildTransfersSheet(wb: ExcelJS.Workbook, items: Transaction[], accounts: Account[]) {
  const ws = wb.addWorksheet("Transfers");
  ws.columns = [{ width: 12 }, { width: 24 }, { width: 18 }, { width: 10 }, { width: 12 }, { width: 12 }];
  const hdr = ws.addRow(["Date", "Description", "Account", "Currency", "Amount", "Fee"]);
  styleHeader(hdr);
  const acctName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  for (const t of items) {
    const r = ws.addRow([
      new Date(t.dateISO).toISOString().slice(0, 10),
      t.merchant,
      acctName(t.accountId),
      t.currency,
      t.amount,
      0,
    ]);
    r.getCell(5).numFmt = '#,##0.00';
  }
}

function buildAccountsSheet(wb: ExcelJS.Workbook, accounts: Account[]) {
  const ws = wb.addWorksheet("Accounts");
  ws.columns = [{ width: 20 }, { width: 18 }, { width: 12 }, { width: 10 }, { width: 14 }, { width: 14 }];
  const hdr = ws.addRow(["Account", "Institution", "Type", "Currency", "Balance", "Balance (USD)"]);
  styleHeader(hdr);
  for (const a of accounts) {
    const r = ws.addRow([a.name, a.institution, a.type, a.currency, a.balance, toUSD(a.balance, a.currency)]);
    r.getCell(5).numFmt = '#,##0.00';
    r.getCell(6).numFmt = '"$"#,##0.00';
  }
}

function buildBudgetsSheet(wb: ExcelJS.Workbook, monthly: Transaction[]) {
  const ws = wb.addWorksheet("Budgets");
  ws.columns = [{ width: 18 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 12 }];
  const hdr = ws.addRow(["Category", "Budget (USD)", "Spent (USD)", "Remaining", "% Used"]);
  styleHeader(hdr);
  const budgets: Record<string, number> = {
    restaurants: 400, groceries: 500, shopping: 300, transport: 200,
    subscriptions: 120, bills: 700, entertainment: 250, health: 150,
  };
  const spent: Record<string, number> = {};
  for (const t of monthly) {
    if (!isExpense(t)) continue;
    spent[t.category] = (spent[t.category] ?? 0) + toUSD(Math.abs(t.amount), t.currency);
  }
  for (const [cat, budget] of Object.entries(budgets)) {
    const s = spent[cat] ?? 0;
    const r = ws.addRow([CATEGORIES[cat as keyof typeof CATEGORIES]?.label ?? cat, budget, s, budget - s, s / budget]);
    r.getCell(2).numFmt = '"$"#,##0';
    r.getCell(3).numFmt = '"$"#,##0.00';
    r.getCell(4).numFmt = '"$"#,##0.00';
    r.getCell(5).numFmt = '0%';
  }
}

function buildGoalsSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet("Goals");
  ws.columns = [{ width: 22 }, { width: 14 }, { width: 14 }, { width: 12 }];
  const hdr = ws.addRow(["Goal", "Target (USD)", "Saved (USD)", "Progress"]);
  styleHeader(hdr);
  const goals: [string, number, number][] = [
    ["Emergency fund", 15000, 9840],
    ["Vacation · Cusco", 3000, 1250],
    ["New laptop", 2500, 2100],
  ];
  for (const [g, target, saved] of goals) {
    const r = ws.addRow([g, target, saved, saved / target]);
    r.getCell(2).numFmt = '"$"#,##0';
    r.getCell(3).numFmt = '"$"#,##0';
    r.getCell(4).numFmt = '0%';
  }
}

function buildMonthlySummarySheet(wb: ExcelJS.Workbook, monthly: Transaction[], accounts: Account[]) {
  const ws = wb.addWorksheet("Monthly Summary", { properties: { tabColor: { argb: "FF34D399" } } });
  ws.columns = [{ width: 26 }, { width: 22 }];
  titleRow(ws, "Monthly Summary", 2);

  const income = monthly.filter(isIncome).reduce((s, t) => s + toUSD(t.amount, t.currency), 0);
  const expense = monthly.filter(isExpense).reduce((s, t) => s + toUSD(Math.abs(t.amount), t.currency), 0);
  const transfers = monthly.filter(isTransfer).reduce((s, t) => s + toUSD(Math.abs(t.amount), t.currency), 0);
  const ccPayments = monthly
    .filter((t) => isTransfer(t) && t.merchant.toLowerCase().includes("io"))
    .reduce((s, t) => s + toUSD(Math.abs(t.amount), t.currency), 0);
  const expenses = monthly.filter(isExpense);
  const incomes = monthly.filter(isIncome);
  const largestExpense = expenses.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];
  const largestIncome = incomes.sort((a, b) => b.amount - a.amount)[0];
  const debt = accounts.filter((a) => a.balance < 0).reduce((s, a) => s + toUSD(Math.abs(a.balance), a.currency), 0);

  const rows: [string, string | number][] = [
    ["Total Income", income],
    ["Total Expenses", expense],
    ["Net Cash Flow", income - expense],
    ["Savings", income - expense],
    ["Transfers", transfers],
    ["Credit Card Payments", ccPayments],
    ["Largest Expense", largestExpense ? `${largestExpense.merchant} (${toUSD(Math.abs(largestExpense.amount), largestExpense.currency).toFixed(2)})` : "—"],
    ["Largest Income", largestIncome ? `${largestIncome.merchant} (${toUSD(largestIncome.amount, largestIncome.currency).toFixed(2)})` : "—"],
    ["Debt Remaining", debt],
  ];
  const hdr = ws.addRow(["Metric", "Value"]);
  styleHeader(hdr);
  for (const [k, v] of rows) {
    const r = ws.addRow([k, v]);
    r.getCell(1).font = { bold: true };
    if (typeof v === "number") r.getCell(2).numFmt = '"$"#,##0.00';
  }

  // Spending by category + income by category
  ws.addRow([]);
  const sh = ws.addRow(["Spending by Category", "Amount (USD)"]);
  styleHeader(sh);
  const byCat = new Map<string, number>();
  for (const t of expenses) byCat.set(t.category, (byCat.get(t.category) ?? 0) + toUSD(Math.abs(t.amount), t.currency));
  for (const [cat, v] of [...byCat.entries()].sort((a, b) => b[1] - a[1])) {
    const r = ws.addRow([CATEGORIES[cat as keyof typeof CATEGORIES]?.label ?? cat, v]);
    r.getCell(2).numFmt = '"$"#,##0.00';
  }
  ws.addRow([]);
  const ih = ws.addRow(["Income by Category", "Amount (USD)"]);
  styleHeader(ih);
  const byInc = new Map<string, number>();
  for (const t of incomes) byInc.set(t.merchant, (byInc.get(t.merchant) ?? 0) + toUSD(t.amount, t.currency));
  for (const [src, v] of [...byInc.entries()].sort((a, b) => b[1] - a[1])) {
    const r = ws.addRow([src, v]);
    r.getCell(2).numFmt = '"$"#,##0.00';
  }

  ws.addRow([]);
  const ah = ws.addRow(["Account Balances", "Balance (USD)"]);
  styleHeader(ah);
  for (const a of accounts) {
    const r = ws.addRow([a.name, toUSD(a.balance, a.currency)]);
    r.getCell(2).numFmt = '"$"#,##0.00';
  }
}

function buildChartsSheet(wb: ExcelJS.Workbook, monthly: Transaction[]) {
  const ws = wb.addWorksheet("Charts");
  ws.columns = [{ width: 20 }, { width: 16 }];
  titleRow(ws, "Charts · Spending by Category", 2);
  const hdr = ws.addRow(["Category", "Amount (USD)"]);
  styleHeader(hdr);
  const byCat = new Map<string, number>();
  for (const t of monthly) {
    if (!isExpense(t)) continue;
    byCat.set(t.category, (byCat.get(t.category) ?? 0) + toUSD(Math.abs(t.amount), t.currency));
  }
  const entries = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map((e) => e[1]), 1);
  for (const [cat, v] of entries) {
    const bars = "█".repeat(Math.max(1, Math.round((v / max) * 20)));
    const r = ws.addRow([CATEGORIES[cat as keyof typeof CATEGORIES]?.label ?? cat, v]);
    r.getCell(2).numFmt = '"$"#,##0.00';
    ws.getCell(`D${r.number}`).value = bars;
    ws.getCell(`D${r.number}`).font = { color: { argb: "FF7C5CFF" } };
  }
  ws.getColumn(4).width = 26;
}

// --- Yearly summary workbook --------------------------------------

export async function buildYearlyWorkbook(
  year: number,
  transactions: Transaction[],
  accounts: Account[]
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "My Money";

  const ws = wb.addWorksheet(`${year} Summary`, { properties: { tabColor: { argb: "FF7C5CFF" } } });
  ws.columns = [{ width: 14 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }];
  titleRow(ws, `${year} Annual Report`, 5);

  const hdr = ws.addRow(["Month", "Income", "Expenses", "Net Cash Flow", "Savings Rate"]);
  styleHeader(hdr);

  let totalIncome = 0;
  let totalExpense = 0;
  for (let m = 0; m < 12; m++) {
    const items = transactions.filter((t) => {
      const d = new Date(t.dateISO);
      return d.getUTCFullYear() === year && d.getUTCMonth() === m;
    });
    const inc = items.filter(isIncome).reduce((s, t) => s + toUSD(t.amount, t.currency), 0);
    const exp = items.filter(isExpense).reduce((s, t) => s + toUSD(Math.abs(t.amount), t.currency), 0);
    totalIncome += inc;
    totalExpense += exp;
    const r = ws.addRow([MONTH_NAMES[m], inc, exp, inc - exp, inc > 0 ? (inc - exp) / inc : 0]);
    r.getCell(2).numFmt = '"$"#,##0';
    r.getCell(3).numFmt = '"$"#,##0';
    r.getCell(4).numFmt = '"$"#,##0';
    r.getCell(5).numFmt = '0%';
  }
  ws.addRow([]);
  const debt = accounts.filter((a) => a.balance < 0).reduce((s, a) => s + toUSD(Math.abs(a.balance), a.currency), 0);
  const assets = accounts.filter((a) => a.balance > 0).reduce((s, a) => s + toUSD(a.balance, a.currency), 0);
  const totals: [string, number][] = [
    ["Total Income", totalIncome],
    ["Total Expenses", totalExpense],
    ["Net Cash Flow", totalIncome - totalExpense],
    ["Savings Rate", totalIncome > 0 ? (totalIncome - totalExpense) / totalIncome : 0],
    ["Net Worth", assets - debt],
    ["Debt Remaining", debt],
  ];
  for (const [k, v] of totals) {
    const r = ws.addRow([k, v]);
    r.getCell(1).font = { bold: true };
    r.getCell(2).numFmt = k === "Savings Rate" ? '0%' : '"$"#,##0.00';
  }
  return wb;
}

export async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const arr = await wb.xlsx.writeBuffer();
  return Buffer.from(arr);
}
