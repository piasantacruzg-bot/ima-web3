import type { Account, CategoryKey, Transaction } from "./types";
import { convert } from "./format";
import { CATEGORIES, NOW } from "./data";

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
