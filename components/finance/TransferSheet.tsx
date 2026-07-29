"use client";

import { useMemo, useState } from "react";
import type { Account } from "@/lib/finance/types";
import { money, quoteTransfer, USD_PEN_RATE, currencySymbol } from "@/lib/finance/format";
import { useFinance } from "@/lib/finance/store";
import { Sheet, haptic } from "./ui";

export function TransferSheet({
  open,
  onClose,
  initialFromId,
}: {
  open: boolean;
  onClose: () => void;
  initialFromId?: string;
}) {
  const { accounts, feeRules, addTransaction } = useFinance();
  const spendable = accounts;
  const [fromId, setFromId] = useState(initialFromId ?? accounts[0].id);
  const [toId, setToId] = useState(
    accounts.find((a) => a.id !== (initialFromId ?? accounts[0].id))!.id
  );
  const [amountStr, setAmountStr] = useState("");
  const [stage, setStage] = useState<"form" | "confirm" | "done">("form");

  // Keep the selected accounts valid & distinct.
  const from = spendable.find((a) => a.id === fromId) ?? spendable[0];
  const to = spendable.find((a) => a.id === toId && a.id !== fromId) ??
    spendable.find((a) => a.id !== fromId)!;

  const amount = parseFloat(amountStr) || 0;
  const quote = useMemo(
    () => quoteTransfer(from, to, amount, feeRules),
    [from, to, amount, feeRules]
  );

  const reset = () => {
    setAmountStr("");
    setStage("form");
  };

  const close = () => {
    reset();
    onClose();
  };

  const swap = () => {
    haptic();
    setFromId(to.id);
    setToId(from.id);
  };

  const confirm = () => {
    haptic([12, 8, 20]);
    // Record as a signed expense on the source; the store mirrors the credit.
    addTransaction({
      accountId: from.id,
      merchant: `Transfer to ${to.name}`,
      category: "transfer",
      amount: -(amount + quote.fee),
      destinationAccountId: to.id,
      transferFee: quote.fee,
      note: quote.crossCurrency
        ? `FX ${currencySymbol(from.currency)}→${currencySymbol(to.currency)} @ ${quote.rate.toFixed(3)}`
        : undefined,
    });
    setStage("done");
    setTimeout(close, 2200);
  };

  const insufficient = amount + quote.fee > from.balance && from.type !== "credit";

  return (
    <Sheet open={open} onClose={close} title={stage === "done" ? undefined : "Transfer"}>
      {stage === "done" ? (
        <TransferSuccess from={from} to={to} quote={quote} />
      ) : (
        <>
          {/* Animated card pair */}
          <div className="relative mb-5 grid grid-cols-2 gap-3">
            <MiniCard account={from} role="From" active={stage !== "form"} />
            <MiniCard account={to} role="To" active={stage !== "form"} incoming />
            <button
              onClick={swap}
              aria-label="Swap accounts"
              className="press absolute left-1/2 top-1/2 z-10 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-elevated text-sm shadow-float"
            >
              ⇄
            </button>
            {/* Flying money dot while confirming */}
            {stage === "confirm" && amount > 0 && (
              <span
                key={amount}
                className="pointer-events-none absolute top-1/2 z-20 h-3 w-3 -translate-y-1/2 rounded-full gradient-brand shadow-glow"
                style={{ animation: "fly 1s cubic-bezier(0.5,0,0.5,1) infinite", left: 0 }}
              />
            )}
            <style>{`@keyframes fly{0%{left:22%;opacity:0;transform:translateY(-50%) scale(0.6)}20%{opacity:1}80%{opacity:1}100%{left:74%;opacity:0;transform:translateY(-50%) scale(1)}}`}</style>
          </div>

          {stage === "form" && (
            <>
              {/* Account pickers */}
              <div className="mb-4 grid grid-cols-2 gap-3">
                <Picker label="From" accounts={spendable} value={from.id} exclude={to.id} onChange={setFromId} />
                <Picker label="To" accounts={spendable} value={to.id} exclude={from.id} onChange={setToId} />
              </div>

              {/* Amount */}
              <label className="mb-4 block">
                <span className="mb-1.5 block px-1 text-xs font-medium text-muted">
                  Amount ({from.currency})
                </span>
                <div className="flex items-center gap-2 rounded-3xl border border-line bg-canvas px-4 py-3">
                  <span className="text-2xl font-semibold text-muted">
                    {currencySymbol(from.currency)}
                  </span>
                  <input
                    autoFocus
                    inputMode="decimal"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="0.00"
                    className="w-full bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-faint tnum"
                  />
                </div>
              </label>

              {/* Live quote */}
              {amount > 0 && (
                <div className="mb-4 animate-fade-up space-y-2.5 rounded-3xl border border-line bg-canvas/60 p-4 text-sm">
                  <Row label="Money leaving" value={money(-quote.totalDeducted, from.currency, { sign: true, decimals: 2 })} valueClass="text-negative" />
                  <Row
                    label="Money arriving"
                    value={"+" + money(quote.received, to.currency).replace("−", "")}
                    valueClass="text-positive"
                  />
                  <Divider />
                  <Row
                    label="Transfer fee"
                    value={quote.fee > 0 ? money(quote.fee, from.currency) : "Free"}
                    valueClass={quote.fee > 0 ? "" : "text-positive"}
                    hint={quote.feeLabel}
                  />
                  {quote.crossCurrency && (
                    <>
                      <Row label="Exchange rate" value={`1 ${from.currency} = ${quote.rate.toFixed(3)} ${to.currency}`} />
                      <Row label="Conversion fee" value={money(quote.fxFee, from.currency)} />
                      <Row label="Effective rate" value={`${quote.effectiveRate.toFixed(3)} ${to.currency}/${from.currency}`} />
                    </>
                  )}
                  <Divider />
                  <Row label="Balance after (from)" value={money(quote.fromBalanceAfter, from.currency)} />
                  <Row label="Balance after (to)" value={money(quote.toBalanceAfter, to.currency)} />
                  <div className="flex items-center justify-between pt-1 text-xs text-muted">
                    <span>⏱ {quote.arrival}</span>
                    <span>{quote.type}</span>
                  </div>
                </div>
              )}

              {insufficient && (
                <p className="mb-3 rounded-2xl bg-negative/10 px-3 py-2 text-center text-xs text-negative">
                  Not enough available in {from.name}.
                </p>
              )}

              <button
                disabled={amount <= 0 || insufficient}
                onClick={() => {
                  haptic();
                  setStage("confirm");
                }}
                className="press gradient-brand w-full rounded-3xl py-3.5 text-base font-semibold text-white shadow-glow disabled:opacity-40"
              >
                Review transfer
              </button>
            </>
          )}

          {stage === "confirm" && (
            <div className="animate-fade-up">
              <div className="mb-5 rounded-3xl border border-line bg-canvas/60 p-5 text-center">
                <div className="text-xs text-muted">You send</div>
                <div className="mt-1 text-4xl font-bold tracking-tight tnum">
                  {money(amount, from.currency)}
                </div>
                {quote.crossCurrency && (
                  <div className="mt-2 text-sm text-muted">
                    {to.name} receives{" "}
                    <span className="font-semibold text-positive">{money(quote.received, to.currency)}</span>
                    <div className="mt-0.5 text-xs">1 {from.currency} = {quote.rate.toFixed(3)} {to.currency}</div>
                  </div>
                )}
                <div className="mt-3 text-xs text-muted">
                  {quote.fee > 0 ? `Incl. ${money(quote.fee, from.currency)} fee · ` : "No fee · "}
                  {quote.arrival}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setStage("form")}
                  className="press rounded-3xl border border-line py-3.5 font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={confirm}
                  className="press gradient-brand rounded-3xl py-3.5 font-semibold text-white shadow-glow"
                >
                  Confirm & send
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}

function MiniCard({
  account,
  role,
  active,
  incoming,
}: {
  account: Account;
  role: string;
  active: boolean;
  incoming?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-3.5 text-white transition-transform duration-500 ease-spring ${
        active ? (incoming ? "scale-[1.03]" : "scale-[0.98]") : ""
      }`}
      style={{ backgroundImage: `linear-gradient(135deg, ${account.gradient[0]}, ${account.gradient[1]})` }}
    >
      <div className="text-[10px] font-medium uppercase tracking-wider text-white/70">{role}</div>
      <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
        <span>{account.emoji}</span>
        <span className="truncate">{account.name}</span>
      </div>
      <div className="mt-2 text-lg font-bold tnum">{money(account.balance, account.currency)}</div>
    </div>
  );
}

function Picker({
  label,
  accounts,
  value,
  exclude,
  onChange,
}: {
  label: string;
  accounts: Account[];
  value: string;
  exclude: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-xs font-medium text-muted">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            haptic();
            onChange(e.target.value);
          }}
          className="w-full appearance-none rounded-2xl border border-line bg-canvas px-3 py-2.5 text-sm font-medium outline-none focus:border-brand"
        >
          {accounts
            .filter((a) => a.id !== exclude)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.emoji} {a.name} · {money(a.balance, a.currency)}
              </option>
            ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint">⌄</span>
      </div>
    </label>
  );
}

function Row({
  label,
  value,
  valueClass = "",
  hint,
}: {
  label: string;
  value: string;
  valueClass?: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-muted">{label}</div>
        {hint && <div className="text-[11px] text-faint">{hint}</div>}
      </div>
      <div className={`font-semibold tnum ${valueClass}`}>{value}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-line" />;
}

function TransferSuccess({
  from,
  to,
  quote,
}: {
  from: Account;
  to: Account;
  quote: ReturnType<typeof quoteTransfer>;
}) {
  return (
    <div className="py-6 text-center animate-scale-in">
      <div className="relative mx-auto grid h-20 w-20 place-items-center">
        <span className="absolute h-20 w-20 animate-pulse-ring rounded-full bg-positive/40" />
        <span className="grid h-20 w-20 place-items-center rounded-full bg-positive text-4xl text-white shadow-glow-green">
          ✓
        </span>
      </div>
      <h2 className="mt-5 text-xl font-bold tracking-tight">Transfer sent</h2>
      <p className="mt-1 text-sm text-muted">
        {money(quote.amount, from.currency)} from {from.name} → {to.name}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-positive">
        {to.name} received {money(quote.received, to.currency)}
      </p>
      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-xs text-muted">
        <span className="h-2 w-2 rounded-full bg-warning" /> Syncing to Google Drive…
      </div>
    </div>
  );
}
