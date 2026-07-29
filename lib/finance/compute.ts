import type { Account, CategoryKey, Insight, Transaction } from "./types";
import { convert, money } from "./format";
import { CATEGORIES, NOW } from "./data";

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const toUSD = (amount: number, currency: "USD" | "PEN") =>
  convert(amount, currency, "USD");

export function within(dateISO: string, days: number, now = NOW): boolean {
  const d = new Date(dateISO);
  const diff = (now.getTime() - d.getTime()) / 86_400_000;
  return diff >= 0 && diff <= days;
}

export function isSameDay(dateISO: string, now = NOW): boolean {
  return new Date(dateISO).toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
}

export function isThisMonth(dateISO: string, now = NOW): boolean {
  const d = new Date(dateISO);
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
}

/** Live account balances = base balance already reflected in seed;
 *  user-added transactions adjust the balance of their account. */
export function liveAccounts(
  base: Account[],
  userTx: Transaction[]
): Account[] {
  return base.map((a) => {
    const delta = userTx
      .filter((t) => t.accountId === a.id)
      .reduce((s, t) => s + t.amount, 0);
    if (delta === 0) return a;
    const balance = a.balance + delta;
    const history = [...a.history.slice(1), balance];
    return { ...a, balance, history };
  });
}

export interface DashboardMetrics {
  netWorth: number;
  assets: number;
  cash: number;
  debt: number;
  spentToday: number;
  spentWeek: number;
  spentMonth: number;
  incomeMonth: number;
  savedMonth: number;
  cashFlow: number;
  currency: "USD";
}

export function computeMetrics(
  accounts: Account[],
  transactions: Transaction[]
): DashboardMetrics {
  const assets = accounts
    .filter((a) => a.balance > 0)
    .reduce((s, a) => s + toUSD(a.balance, a.currency), 0);
  const debt = accounts
    .filter((a) => a.balance < 0)
    .reduce((s, a) => s + toUSD(Math.abs(a.balance), a.currency), 0);
  const cash = accounts
    .filter((a) => a.type !== "credit")
    .reduce((s, a) => s + toUSD(Math.max(a.balance, 0), a.currency), 0);

  const spent = (f: (t: Transaction) => boolean) =>
    transactions
      .filter((t) => t.amount < 0 && t.category !== "transfer" && f(t))
      .reduce((s, t) => s + toUSD(Math.abs(t.amount), t.currency), 0);
  const income = (f: (t: Transaction) => boolean) =>
    transactions
      .filter((t) => t.amount > 0 && t.category !== "transfer" && f(t))
      .reduce((s, t) => s + toUSD(t.amount, t.currency), 0);

  const spentMonth = spent((t) => isThisMonth(t.dateISO));
  const incomeMonth = income((t) => isThisMonth(t.dateISO));

  return {
    netWorth: assets - debt,
    assets,
    cash,
    debt,
    spentToday: spent((t) => isSameDay(t.dateISO)),
    spentWeek: spent((t) => within(t.dateISO, 7)),
    spentMonth,
    incomeMonth,
    savedMonth: incomeMonth - spentMonth,
    cashFlow: incomeMonth - spentMonth,
    currency: "USD",
  };
}

export function computeSpendByCategory(transactions: Transaction[]) {
  const map = new Map<CategoryKey, number>();
  for (const t of transactions) {
    if (t.amount >= 0 || t.category === "transfer") continue;
    if (!isThisMonth(t.dateISO)) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + toUSD(Math.abs(t.amount), t.currency));
  }
  return [...map.entries()]
    .map(([key, value]) => ({ value, ...CATEGORIES[key] }))
    .sort((a, b) => b.value - a.value);
}

// Group transactions into a social-feed style timeline.
export type TimeBucket =
  | "Today"
  | "Yesterday"
  | "This Week"
  | "Last Week"
  | "This Month"
  | "Earlier";

export function bucketFor(dateISO: string, now = NOW): TimeBucket {
  const d = new Date(dateISO);
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (isSameDay(dateISO, now)) return "Today";
  if (days === 1) return "Yesterday";
  if (days <= 7) return "This Week";
  if (days <= 14) return "Last Week";
  if (isThisMonth(dateISO, now)) return "This Month";
  return "Earlier";
}

const BUCKET_ORDER: TimeBucket[] = [
  "Today",
  "Yesterday",
  "This Week",
  "Last Week",
  "This Month",
  "Earlier",
];

// Net-worth trajectory over the last N months (USD), reconstructed from
// the actual transaction history so it grows as you add data.
export function computeNetWorthSeries(
  accounts: Account[],
  transactions: Transaction[],
  months = 12,
  now = NOW
): { values: number[]; labels: string[] } {
  const current = accounts.reduce((s, a) => s + toUSD(a.balance, a.currency), 0);
  const totalTx = transactions.reduce((s, t) => s + toUSD(t.amount, t.currency), 0);
  const base = current - totalTx; // opening net worth before any transactions
  const values: number[] = [];
  const labels: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0, 23, 59, 59));
    const cum = transactions
      .filter((t) => new Date(t.dateISO).getTime() <= monthEnd.getTime())
      .reduce((s, t) => s + toUSD(t.amount, t.currency), 0);
    values.push(base + cum);
    labels.push(MONTH_SHORT[monthEnd.getUTCMonth()]);
  }
  return { values, labels };
}

// Income vs. expense for the last N months (USD).
export function computeCashflowSeries(
  transactions: Transaction[],
  months = 6,
  now = NOW
): { month: string; income: number; expense: number }[] {
  const out: { month: string; income: number; expense: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() - i;
    const inMonth = (t: Transaction) => {
      const d = new Date(t.dateISO);
      return d.getUTCFullYear() * 12 + d.getUTCMonth() === y * 12 + m;
    };
    const income = transactions
      .filter((t) => t.amount > 0 && t.category !== "transfer" && inMonth(t))
      .reduce((s, t) => s + toUSD(t.amount, t.currency), 0);
    const expense = transactions
      .filter((t) => t.amount < 0 && t.category !== "transfer" && inMonth(t))
      .reduce((s, t) => s + toUSD(Math.abs(t.amount), t.currency), 0);
    out.push({ month: MONTH_SHORT[((m % 12) + 12) % 12], income, expense });
  }
  return out;
}

// Real, data-driven insights. Empty until there's something to say.
export function generateInsights(
  accounts: Account[],
  transactions: Transaction[],
  metrics: DashboardMetrics
): Insight[] {
  const out: Insight[] = [];
  if (transactions.length === 0) return out;

  const byCat = computeSpendByCategory(transactions);
  if (byCat.length > 0) {
    const top = byCat[0];
    out.push({
      id: "in-top",
      tone: "neutral",
      emoji: top.emoji,
      title: `Most spent on ${top.label}`,
      detail: `${money(top.value, "USD")} on ${top.label} so far this month.`,
    });
  }

  if (metrics.incomeMonth > 0 || metrics.spentMonth > 0) {
    if (metrics.savedMonth >= 0) {
      out.push({
        id: "in-save",
        tone: "positive",
        emoji: "📈",
        title: "Saving this month",
        detail: `You've kept ${money(metrics.savedMonth, "USD")} of your income this month.`,
      });
    } else {
      out.push({
        id: "in-over",
        tone: "warning",
        emoji: "⚠️",
        title: "Spending over income",
        detail: `You're ${money(Math.abs(metrics.savedMonth), "USD")} over your income this month.`,
      });
    }
  }

  for (const a of accounts) {
    if (a.type === "credit" && a.balance < 0 && a.creditLimit) {
      const util = Math.abs(a.balance) / a.creditLimit;
      if (util > 0.3) {
        out.push({
          id: `in-util-${a.id}`,
          tone: "warning",
          emoji: "💳",
          title: `${a.name} at ${(util * 100).toFixed(0)}%`,
          detail: `Utilization is above 30%. Paying it down helps your score.`,
        });
      }
    }
  }

  const expenses = transactions.filter((t) => t.amount < 0 && t.category !== "transfer" && isThisMonth(t.dateISO));
  if (expenses.length > 0) {
    const largest = expenses.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];
    out.push({
      id: "in-largest",
      tone: "neutral",
      emoji: "🧾",
      title: "Largest expense",
      detail: `${largest.merchant} — ${money(Math.abs(largest.amount), largest.currency)}.`,
    });
  }

  return out.slice(0, 5);
}

export function groupTimeline(transactions: Transaction[]) {
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
  );
  const groups = new Map<TimeBucket, Transaction[]>();
  for (const t of sorted) {
    const b = bucketFor(t.dateISO);
    if (!groups.has(b)) groups.set(b, []);
    groups.get(b)!.push(t);
  }
  return BUCKET_ORDER.filter((b) => groups.has(b)).map((b) => ({
    bucket: b,
    items: groups.get(b)!,
  }));
}
