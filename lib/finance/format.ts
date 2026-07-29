import type { Account, Currency, TransferFeeRule } from "./types";

// Live-ish reference rate used across the app (matches the product spec).
export const USD_PEN_RATE = 3.641;
/** Conversion spread charged on cross-currency transfers (1.2%). */
export const FX_FEE_RATE = 0.012;

const SYMBOL: Record<Currency, string> = { USD: "$", PEN: "S/" };

export function currencySymbol(c: Currency): string {
  return SYMBOL[c];
}

/** Format an amount with its currency symbol, e.g. $1,240.50 or S/364.10 */
export function money(
  amount: number,
  currency: Currency,
  opts: { sign?: boolean; decimals?: number } = {}
): string {
  const { sign = false, decimals = 2 } = opts;
  const abs = Math.abs(amount);
  const body = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(abs);
  const prefix = sign ? (amount < 0 ? "−" : "+") : amount < 0 ? "−" : "";
  return `${prefix}${SYMBOL[currency]}${body}`;
}

/** Compact money for tight spaces: $12.4k, S/1.2M */
export function moneyCompact(amount: number, currency: Currency): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";
  let body: string;
  if (abs >= 1_000_000) body = (abs / 1_000_000).toFixed(1) + "M";
  else if (abs >= 1_000) body = (abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1) + "k";
  else body = abs.toFixed(0);
  return `${sign}${SYMBOL[currency]}${body}`;
}

export function pct(fraction: number, opts: { sign?: boolean } = {}): string {
  const { sign = true } = opts;
  const v = fraction * 100;
  const s = sign ? (v < 0 ? "−" : "+") : "";
  return `${s}${Math.abs(v).toFixed(1)}%`;
}

/** Convert between currencies at the reference rate. */
export function convert(
  amount: number,
  from: Currency,
  to: Currency
): number {
  if (from === to) return amount;
  if (from === "USD" && to === "PEN") return amount * USD_PEN_RATE;
  return amount / USD_PEN_RATE;
}

/** Everything the UI needs to describe a transfer before it happens. */
export interface TransferQuote {
  amount: number; // amount the sender enters (source currency)
  from: Account;
  to: Account;
  fee: number; // transfer fee (source currency)
  feeLabel: string;
  crossCurrency: boolean;
  rate: number; // 1 source = rate target
  fxFee: number; // conversion fee (source currency)
  effectiveRate: number; // received / amount after all costs
  totalDeducted: number; // amount + fee + fxFee (source currency)
  received: number; // amount arriving (target currency)
  fromBalanceAfter: number;
  toBalanceAfter: number;
  arrival: string;
  type: string;
}

export function quoteTransfer(
  from: Account,
  to: Account,
  amount: number,
  rules: TransferFeeRule[]
): TransferQuote {
  const rule = rules.find((r) => r.fromId === from.id && r.toId === to.id);
  const fee = rule?.fixed ?? 0;
  const feeLabel = rule?.label ?? "No transfer fee.";

  const crossCurrency = from.currency !== to.currency;
  const rate =
    from.currency === to.currency
      ? 1
      : convert(1, from.currency, to.currency);

  // Recipient receives the full conversion at the reference rate; the
  // conversion fee is charged to the sender on top (matches the spec).
  const convertible = Math.max(amount, 0);
  const fxFee = crossCurrency ? convertible * FX_FEE_RATE : 0;
  const received = convert(convertible, from.currency, to.currency);

  const totalDeducted = amount + fee + fxFee;
  // Effective rate = what you actually get per unit spent, all-in.
  const effectiveRate = totalDeducted > 0 ? received / totalDeducted : rate;

  return {
    amount,
    from,
    to,
    fee,
    feeLabel,
    crossCurrency,
    rate,
    fxFee,
    effectiveRate,
    totalDeducted,
    received,
    fromBalanceAfter: from.balance - totalDeducted,
    toBalanceAfter: to.balance + received,
    arrival: estimateArrival(from, to),
    type: transferType(from, to),
  };
}

function transferType(from: Account, to: Account): string {
  if (from.currency !== to.currency) return "International · FX";
  if (from.type === "wallet" || to.type === "wallet") return "Instant · Wallet";
  if (to.type === "credit") return "Card payment";
  return "Standard bank transfer";
}

function estimateArrival(from: Account, to: Account): string {
  if (from.type === "wallet" || to.type === "wallet") return "Instant";
  if (from.currency !== to.currency) return "1–2 business days";
  if (to.type === "credit") return "Same day";
  return "Within a few hours";
}

// --- Date helpers -------------------------------------------------

export function daysUntil(iso: string, now = new Date("2026-07-29T12:00:00")): number {
  const d = new Date(iso);
  const ms = d.getTime() - now.getTime();
  return Math.ceil(ms / 86_400_000);
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function relativeDue(iso: string): string {
  const d = daysUntil(iso);
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return `in ${d} days`;
}
