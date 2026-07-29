// ============================================================
// Domain model for the Aura premium finance experience.
// Everything here is client-side demo data — no backend needed.
// ============================================================

export type Currency = "USD" | "PEN";

export type AccountType =
  | "debit"
  | "credit"
  | "savings"
  | "cash"
  | "wallet";

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  currency: Currency;
  /** Available balance. For credit accounts this is negative (what you owe). */
  balance: number;
  last4?: string;
  /** Tailwind gradient stops used to paint the card face. */
  gradient: [string, string];
  emoji: string;
  /** Month-over-month change of the balance, as a fraction (0.032 = +3.2%). */
  monthlyChange: number;
  /** ~12 recent balance points, oldest → newest, for the sparkline. */
  history: number[];
  // Credit-only fields
  creditLimit?: number;
  statementBalance?: number;
  dueDateISO?: string;
}

export type CategoryKey =
  | "income"
  | "restaurants"
  | "groceries"
  | "shopping"
  | "transport"
  | "subscriptions"
  | "bills"
  | "entertainment"
  | "health"
  | "transfer";

export interface Category {
  key: CategoryKey;
  label: string;
  emoji: string;
  color: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  merchant: string;
  category: CategoryKey;
  /** Negative = money out, positive = money in. In the account's currency. */
  amount: number;
  currency: Currency;
  dateISO: string;
  note?: string;
  location?: string;
  balanceAfter: number;
  recurring?: boolean;
}

export interface Bill {
  id: string;
  name: string;
  emoji: string;
  amount: number;
  currency: Currency;
  dueDateISO: string;
  accountId: string;
  autopay: boolean;
}

export interface Subscription {
  id: string;
  name: string;
  emoji: string;
  amount: number;
  currency: Currency;
  nextChargeISO: string;
  accountId: string;
  cadence: "monthly" | "yearly";
}

export type InsightTone = "positive" | "warning" | "neutral";

export interface Insight {
  id: string;
  tone: InsightTone;
  emoji: string;
  title: string;
  detail: string;
}

/** Fee applied when moving money out of an account into another. */
export interface TransferFeeRule {
  fromId: string;
  toId: string;
  /** Fixed fee in the *source* account currency. */
  fixed: number;
  label: string;
}
