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
import { USD_PEN_RATE } from "./format";

// "Now" tracks the real current date so the dashboard's monthly counters
// reset on the 1st of each month and each month gets its own workbook.
export const NOW = new Date();

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
  other: { key: "other", label: "Other", emoji: "🏷️", color: "#8b93a7" },
  transfer: { key: "transfer", label: "Transfers", emoji: "🔄", color: "#94a3b8" },
};

// --- Accounts -----------------------------------------------------
// Everything starts at zero. Balances build up from your own transactions.

const flat = Array<number>(12).fill(0);

export const ACCOUNTS: Account[] = [
  {
    id: "boa",
    name: "Bank of America",
    institution: "Debit · Checking",
    type: "debit",
    currency: "USD",
    balance: 0,
    last4: "4417",
    gradient: ["#c2143b", "#7a0f26"],
    emoji: "🏦",
    monthlyChange: 0,
    history: flat,
  },
  {
    id: "kast",
    name: "KAST",
    institution: "USD Wallet",
    type: "wallet",
    currency: "USD",
    balance: 0,
    last4: "0921",
    gradient: ["#111827", "#0b1220"],
    emoji: "⚡",
    monthlyChange: 0,
    history: flat,
  },
  {
    id: "io",
    name: "IO Credit Card",
    institution: "Visa · Credit",
    type: "credit",
    currency: "USD",
    balance: 0,
    last4: "8802",
    gradient: ["#4c1d95", "#1e1b4b"],
    emoji: "💳",
    monthlyChange: 0,
    history: flat,
    creditLimit: 6000,
  },
  {
    id: "bcp",
    name: "BCP",
    institution: "Cuenta Sueldo · PEN",
    type: "debit",
    currency: "PEN",
    balance: 0,
    last4: "3390",
    gradient: ["#0a5bd3", "#062f6e"],
    emoji: "🏛️",
    monthlyChange: 0,
    history: flat,
  },
  {
    id: "falabella",
    name: "Falabella",
    institution: "Cuenta Ahorros · PEN",
    type: "savings",
    currency: "PEN",
    balance: 0,
    last4: "1175",
    gradient: ["#0f9d58", "#0a6b3c"],
    emoji: "🌱",
    monthlyChange: 0,
    history: flat,
  },
  {
    id: "cash",
    name: "Cash",
    institution: "Efectivo · PEN",
    type: "cash",
    currency: "PEN",
    balance: 0,
    gradient: ["#334155", "#1e293b"],
    emoji: "💵",
    monthlyChange: 0,
    history: flat,
  },
];

export const accountById = (id: string) => ACCOUNTS.find((a) => a.id === id)!;

// --- Transfer fee rules (from the product spec) -------------------

export const FEE_RULES: TransferFeeRule[] = [
  { fromId: "boa", toId: "kast", fixed: 5, label: "$5 fixed network fee" },
  { fromId: "kast", toId: "boa", fixed: 0, label: "No transfer fee." },
  { fromId: "bcp", toId: "falabella", fixed: 2.5, label: "S/2.50 interbank fee" },
  { fromId: "falabella", toId: "bcp", fixed: 2.5, label: "S/2.50 interbank fee" },
  { fromId: "boa", toId: "io", fixed: 0, label: "No transfer fee." },
  { fromId: "kast", toId: "io", fixed: 0, label: "No transfer fee." },
];

// --- Seed data: intentionally empty. You start from zero. ----------

export const TRANSACTIONS: Transaction[] = [];
export const BILLS: Bill[] = [];
export const SUBSCRIPTIONS: Subscription[] = [];
export const INSIGHTS: Insight[] = [];

// A savings goal is opt-in; target 0 means "no goal set yet".
export const SAVINGS_GOAL = { target: 0, saved: 0, label: "Savings goal" };

export { USD_PEN_RATE };
