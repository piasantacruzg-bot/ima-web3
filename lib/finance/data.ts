import type {
  Account,
  Bill,
  Category,
  CategoryKey,
  Insight,
  Subscription,
  Transaction,
  TransferFeeRule,
} from "./types";
import { USD_PEN_RATE, convert } from "./format";

// "Now" is pinned so the demo is deterministic.
export const NOW = new Date("2026-07-29T12:00:00");

export const CATEGORIES: Record<CategoryKey, Category> = {
  income: { key: "income", label: "Income", emoji: "💰", color: "#34d399" },
  restaurants: { key: "restaurants", label: "Restaurants", emoji: "🍽️", color: "#fb7185" },
  groceries: { key: "groceries", label: "Groceries", emoji: "🛒", color: "#2dd4bf" },
  shopping: { key: "shopping", label: "Shopping", emoji: "🛍️", color: "#8b7cff" },
  transport: { key: "transport", label: "Transport", emoji: "🚕", color: "#4cc9f0" },
  subscriptions: { key: "subscriptions", label: "Subscriptions", emoji: "🔁", color: "#fbbf24" },
  bills: { key: "bills", label: "Bills & Utilities", emoji: "⚡", color: "#f472b6" },
  entertainment: { key: "entertainment", label: "Entertainment", emoji: "🎬", color: "#5b8def" },
  health: { key: "health", label: "Health", emoji: "💊", color: "#a78bfa" },
  transfer: { key: "transfer", label: "Transfers", emoji: "🔄", color: "#94a3b8" },
};

// --- Accounts -----------------------------------------------------

export const ACCOUNTS: Account[] = [
  {
    id: "boa",
    name: "Bank of America",
    institution: "Debit · Checking",
    type: "debit",
    currency: "USD",
    balance: 8420.55,
    last4: "4417",
    gradient: ["#c2143b", "#7a0f26"],
    emoji: "🏦",
    monthlyChange: 0.041,
    history: [7100, 7250, 7480, 7390, 7720, 7900, 8010, 8240, 8120, 8360, 8290, 8420.55],
  },
  {
    id: "kast",
    name: "KAST",
    institution: "USD Wallet",
    type: "wallet",
    currency: "USD",
    balance: 3260.0,
    last4: "0921",
    gradient: ["#111827", "#0b1220"],
    emoji: "⚡",
    monthlyChange: 0.128,
    history: [1200, 1450, 1600, 1900, 2100, 2400, 2600, 2750, 2900, 3050, 3180, 3260],
  },
  {
    id: "io",
    name: "IO Credit Card",
    institution: "Visa · Credit",
    type: "credit",
    currency: "USD",
    balance: -1840.3,
    last4: "8802",
    gradient: ["#4c1d95", "#1e1b4b"],
    emoji: "💳",
    monthlyChange: 0.09,
    history: [-900, -1100, -1250, -1180, -1400, -1520, -1600, -1720, -1690, -1780, -1810, -1840.3],
    creditLimit: 6000,
    statementBalance: 1840.3,
    dueDateISO: "2026-08-05",
  },
  {
    id: "bcp",
    name: "BCP",
    institution: "Cuenta Sueldo · PEN",
    type: "debit",
    currency: "PEN",
    balance: 14320.8,
    last4: "3390",
    gradient: ["#0a5bd3", "#062f6e"],
    emoji: "🏛️",
    monthlyChange: 0.022,
    history: [11800, 12100, 12400, 12250, 12800, 13100, 13400, 13600, 13850, 14050, 14210, 14320.8],
  },
  {
    id: "falabella",
    name: "Falabella",
    institution: "Cuenta Ahorros · PEN",
    type: "savings",
    currency: "PEN",
    balance: 22150.0,
    last4: "1175",
    gradient: ["#0f9d58", "#0a6b3c"],
    emoji: "🌱",
    monthlyChange: 0.058,
    history: [17800, 18300, 18900, 19400, 19900, 20300, 20800, 21100, 21500, 21800, 22000, 22150],
  },
  {
    id: "cash",
    name: "Cash",
    institution: "Efectivo · PEN",
    type: "cash",
    currency: "PEN",
    balance: 540.0,
    gradient: ["#334155", "#1e293b"],
    emoji: "💵",
    monthlyChange: -0.14,
    history: [820, 780, 900, 700, 640, 720, 610, 580, 650, 600, 570, 540],
  },
];

export const accountById = (id: string) =>
  ACCOUNTS.find((a) => a.id === id)!;

// --- Transfer fee rules (from the product spec) -------------------

export const FEE_RULES: TransferFeeRule[] = [
  { fromId: "boa", toId: "kast", fixed: 5, label: "$5 fixed network fee" },
  { fromId: "kast", toId: "boa", fixed: 0, label: "No transfer fee." },
  { fromId: "bcp", toId: "falabella", fixed: 2.5, label: "S/2.50 interbank fee" },
  { fromId: "falabella", toId: "bcp", fixed: 2.5, label: "S/2.50 interbank fee" },
  { fromId: "boa", toId: "io", fixed: 0, label: "No transfer fee." },
  { fromId: "kast", toId: "io", fixed: 0, label: "No transfer fee." },
];

// --- Transactions -------------------------------------------------

function tx(
  id: string,
  accountId: string,
  merchant: string,
  category: CategoryKey,
  amount: number,
  dateISO: string,
  balanceAfter: number,
  extra: Partial<Transaction> = {}
): Transaction {
  const currency = accountById(accountId).currency;
  return { id, accountId, merchant, category, amount, currency, dateISO, balanceAfter, ...extra };
}

export const TRANSACTIONS: Transaction[] = [
  // Today — 2026-07-29
  tx("t1", "kast", "Blue Bottle Coffee", "restaurants", -6.5, "2026-07-29T08:12:00", 3260.0, { location: "San Isidro, Lima", note: "Oat flat white" }),
  tx("t2", "bcp", "Metro Supermercado", "groceries", -184.3, "2026-07-29T10:40:00", 14320.8, { location: "Miraflores" }),
  tx("t3", "io", "Uber", "transport", -14.8, "2026-07-29T11:05:00", -1840.3, { location: "Lima" }),
  // Yesterday
  tx("t4", "boa", "Payroll · IMA WEB3", "income", 3200.0, "2026-07-28T09:00:00", 8426.5, { note: "Bi-weekly salary", recurring: true }),
  tx("t5", "io", "Amazon", "shopping", -212.4, "2026-07-28T14:22:00", -1825.5, { note: "Standing desk riser" }),
  tx("t6", "kast", "Rappi", "restaurants", -28.9, "2026-07-28T20:10:00", 3266.5, { location: "Lima" }),
  tx("t7", "bcp", "Netflix", "subscriptions", -44.9, "2026-07-28T00:00:00", 14505.1, { recurring: true }),
  // This week
  tx("t8", "falabella", "Interest earned", "income", 62.3, "2026-07-27T00:00:00", 22150.0, { recurring: true }),
  tx("t9", "io", "Spotify", "subscriptions", -11.99, "2026-07-26T00:00:00", -1613.1, { recurring: true }),
  tx("t10", "boa", "Shell", "transport", -58.2, "2026-07-26T18:30:00", 5226.5, { location: "Lima" }),
  tx("t11", "bcp", "Farmacia InkaFarma", "health", -76.5, "2026-07-25T13:15:00", 14550.0, { location: "Surco" }),
  tx("t12", "kast", "Steam", "entertainment", -34.99, "2026-07-24T21:40:00", 3295.4),
  // Last week
  tx("t13", "boa", "Whole Foods", "groceries", -142.7, "2026-07-22T17:05:00", 5284.7),
  tx("t14", "io", "Apple", "subscriptions", -2.99, "2026-07-21T00:00:00", -1601.1, { note: "iCloud+", recurring: true }),
  tx("t15", "bcp", "Luz del Sur", "bills", -168.4, "2026-07-20T00:00:00", 14626.5, { note: "Electricity", recurring: true }),
  tx("t16", "falabella", "Transfer to BCP", "transfer", -1200.0, "2026-07-19T11:00:00", 22087.7),
  // This month (earlier)
  tx("t17", "kast", "Payroll top-up", "income", 800.0, "2026-07-15T09:00:00", 3330.39, { recurring: true }),
  tx("t18", "io", "Marriott", "entertainment", -420.0, "2026-07-12T15:00:00", -1598.11, { note: "Weekend stay", location: "Paracas" }),
  tx("t19", "bcp", "Sodimac", "shopping", -389.9, "2026-07-10T16:20:00", 14794.9),
  tx("t20", "boa", "Sedapal", "bills", -41.0, "2026-07-08T00:00:00", 5427.4, { note: "Water", recurring: true }),
];

// --- Upcoming bills ----------------------------------------------

export const BILLS: Bill[] = [
  { id: "b1", name: "IO Credit Card", emoji: "💳", amount: 1840.3, currency: "USD", dueDateISO: "2026-08-05", accountId: "boa", autopay: false },
  { id: "b2", name: "Rent · Miraflores", emoji: "🏠", amount: 2400.0, currency: "PEN", dueDateISO: "2026-08-01", accountId: "bcp", autopay: true },
  { id: "b3", name: "Luz del Sur", emoji: "⚡", amount: 172.5, currency: "PEN", dueDateISO: "2026-08-03", accountId: "bcp", autopay: true },
  { id: "b4", name: "Claro Fibra", emoji: "📶", amount: 129.0, currency: "PEN", dueDateISO: "2026-08-07", accountId: "bcp", autopay: true },
];

// --- Subscriptions ------------------------------------------------

export const SUBSCRIPTIONS: Subscription[] = [
  { id: "s1", name: "Netflix", emoji: "🎬", amount: 44.9, currency: "PEN", nextChargeISO: "2026-08-28", accountId: "bcp", cadence: "monthly" },
  { id: "s2", name: "Spotify", emoji: "🎧", amount: 11.99, currency: "USD", nextChargeISO: "2026-08-01", accountId: "io", cadence: "monthly" },
  { id: "s3", name: "iCloud+", emoji: "☁️", amount: 2.99, currency: "USD", nextChargeISO: "2026-08-02", accountId: "io", cadence: "monthly" },
  { id: "s4", name: "ChatGPT", emoji: "🤖", amount: 20.0, currency: "USD", nextChargeISO: "2026-08-04", accountId: "kast", cadence: "monthly" },
  { id: "s5", name: "Notion", emoji: "📝", amount: 96.0, currency: "USD", nextChargeISO: "2026-08-30", accountId: "boa", cadence: "yearly" },
];

// --- Smart insights ----------------------------------------------

export const INSIGHTS: Insight[] = [
  { id: "i1", tone: "warning", emoji: "🍽️", title: "Restaurants up 28%", detail: "You've spent 28% more on restaurants this month than your 3-month average." },
  { id: "i2", tone: "warning", emoji: "📦", title: "Amazon +$212", detail: "Amazon purchases increased by $212 vs. last month. Mostly home office." },
  { id: "i3", tone: "positive", emoji: "💡", title: "Save $145 / mo", detail: "You could save $145 by trimming 3 overlapping streaming subscriptions." },
  { id: "i4", tone: "warning", emoji: "🏦", title: "Watch Bank of America", detail: "Your Bank of America balance may not cover next week's bills after the IO payment." },
  { id: "i5", tone: "warning", emoji: "💳", title: "IO utilization 31%", detail: "Your IO Credit Card utilization is above 30%. Paying $300 brings it under." },
  { id: "i6", tone: "positive", emoji: "📈", title: "Saving more", detail: "You've saved 12% more this month than last — nice momentum." },
];

// ============================================================
// Derived dashboard metrics — the numbers the Home screen answers.
// All money normalised to USD for cross-currency totals.
// ============================================================

const toUSD = (amount: number, currency: "USD" | "PEN") =>
  convert(amount, currency, "USD");

function within(dateISO: string, days: number): boolean {
  const d = new Date(dateISO);
  const diff = (NOW.getTime() - d.getTime()) / 86_400_000;
  return diff >= 0 && diff <= days;
}

function isSameDay(dateISO: string): boolean {
  const d = new Date(dateISO);
  return d.toISOString().slice(0, 10) === NOW.toISOString().slice(0, 10);
}

function isThisMonth(dateISO: string): boolean {
  const d = new Date(dateISO);
  return d.getUTCFullYear() === NOW.getUTCFullYear() && d.getUTCMonth() === NOW.getUTCMonth();
}

const spentSum = (filter: (t: Transaction) => boolean) =>
  TRANSACTIONS.filter((t) => t.amount < 0 && t.category !== "transfer" && filter(t)).reduce(
    (s, t) => s + toUSD(Math.abs(t.amount), t.currency),
    0
  );

const incomeSum = (filter: (t: Transaction) => boolean) =>
  TRANSACTIONS.filter((t) => t.amount > 0 && t.category !== "transfer" && filter(t)).reduce(
    (s, t) => s + toUSD(t.amount, t.currency),
    0
  );

export const METRICS = (() => {
  const assets = ACCOUNTS.filter((a) => a.balance > 0).reduce(
    (s, a) => s + toUSD(a.balance, a.currency),
    0
  );
  const debt = ACCOUNTS.filter((a) => a.balance < 0).reduce(
    (s, a) => s + toUSD(Math.abs(a.balance), a.currency),
    0
  );
  const cash = ACCOUNTS.filter((a) => a.type !== "credit").reduce(
    (s, a) => s + toUSD(Math.max(a.balance, 0), a.currency),
    0
  );

  const spentToday = spentSum((t) => isSameDay(t.dateISO));
  const spentWeek = spentSum((t) => within(t.dateISO, 7));
  const spentMonth = spentSum((t) => isThisMonth(t.dateISO));
  const incomeMonth = incomeSum((t) => isThisMonth(t.dateISO));
  const savedMonth = incomeMonth - spentMonth;

  return {
    netWorth: assets - debt,
    assets,
    cash,
    debt,
    spentToday,
    spentWeek,
    spentMonth,
    incomeMonth,
    savedMonth,
    cashFlow: incomeMonth - spentMonth,
    currency: "USD" as const,
  };
})();

// Net-worth trajectory (last 12 months, USD) for the hero chart.
export const NET_WORTH_SERIES = [
  38200, 39100, 40500, 41200, 40800, 42600, 43900, 45100, 46000, 47200, 48100, METRICS.netWorth,
];

// Spending by category this month (USD) for the donut.
export const SPEND_BY_CATEGORY = (() => {
  const map = new Map<CategoryKey, number>();
  for (const t of TRANSACTIONS) {
    if (t.amount >= 0 || t.category === "transfer") continue;
    if (!isThisMonth(t.dateISO)) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + toUSD(Math.abs(t.amount), t.currency));
  }
  return [...map.entries()]
    .map(([key, value]) => ({ value, ...CATEGORIES[key] }))
    .sort((a, b) => b.value - a.value);
})();

// Income vs. expenses, last 6 months (USD) for the bar chart.
export const CASHFLOW_SERIES = [
  { month: "Feb", income: 4200, expense: 3100 },
  { month: "Mar", income: 4400, expense: 3600 },
  { month: "Apr", income: 4100, expense: 2900 },
  { month: "May", income: 4600, expense: 3400 },
  { month: "Jun", income: 4300, expense: 3050 },
  { month: "Jul", income: Math.round(METRICS.incomeMonth), expense: Math.round(METRICS.spentMonth) },
];

// Monthly savings progress toward a goal (USD).
export const SAVINGS_GOAL = { target: 15000, saved: 9840, label: "Emergency fund" };

export { USD_PEN_RATE };
