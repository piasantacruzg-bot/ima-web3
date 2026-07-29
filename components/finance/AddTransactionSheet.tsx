"use client";

import { useState } from "react";
import type { CategoryKey } from "@/lib/finance/types";
import { CATEGORIES } from "@/lib/finance/data";
import { currencySymbol } from "@/lib/finance/format";
import { useFinance } from "@/lib/finance/store";
import { Sheet, Segmented, haptic } from "./ui";

type Kind = "expense" | "income";

const EXPENSE_CATS: CategoryKey[] = [
  "restaurants", "groceries", "shopping", "transport",
  "subscriptions", "bills", "entertainment", "health",
];
const INCOME_CATS: CategoryKey[] = ["income"];

export function AddTransactionSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { accounts, addTransaction } = useFinance();
  const [kind, setKind] = useState<Kind>("expense");
  const [accountId, setAccountId] = useState(accounts[0].id);
  const [amountStr, setAmountStr] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<CategoryKey>("restaurants");
  const [note, setNote] = useState("");

  const account = accounts.find((a) => a.id === accountId)!;
  const amount = parseFloat(amountStr) || 0;
  const cats = kind === "income" ? INCOME_CATS : EXPENSE_CATS;

  const reset = () => {
    setAmountStr("");
    setMerchant("");
    setNote("");
    setKind("expense");
    setCategory("restaurants");
  };

  const submit = () => {
    if (amount <= 0 || !merchant.trim()) return;
    haptic([12, 6, 12]);
    addTransaction({
      accountId,
      merchant: merchant.trim(),
      category: kind === "income" ? "income" : category,
      amount: kind === "income" ? amount : -amount,
      note: note.trim() || undefined,
    });
    reset();
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add transaction">
      <div className="mb-4 flex justify-center">
        <Segmented<Kind>
          value={kind}
          onChange={(k) => {
            setKind(k);
            setCategory(k === "income" ? "income" : "restaurants");
          }}
          options={[
            { label: "Expense", value: "expense" },
            { label: "Income", value: "income" },
          ]}
        />
      </div>

      {/* Amount */}
      <div className="mb-5 flex items-center justify-center gap-2 rounded-3xl border border-line bg-canvas px-4 py-5">
        <span className="text-3xl font-semibold text-muted">
          {currencySymbol(account.currency)}
        </span>
        <input
          autoFocus
          inputMode="decimal"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0.00"
          className={`w-40 bg-transparent text-center text-4xl font-bold tracking-tight outline-none placeholder:text-faint tnum ${
            kind === "income" ? "text-positive" : "text-ink"
          }`}
        />
      </div>

      {/* Merchant */}
      <input
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
        placeholder={kind === "income" ? "Source (e.g. Salary)" : "Merchant (e.g. Starbucks)"}
        className="mb-3 w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-brand"
      />

      {/* Account */}
      <div className="mb-3">
        <div className="mb-1.5 px-1 text-xs font-medium text-muted">Account</div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                haptic();
                setAccountId(a.id);
              }}
              className={`press flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm ${
                accountId === a.id ? "border-brand bg-brand/10 text-brand-light" : "border-line text-muted"
              }`}
            >
              <span>{a.emoji}</span>
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      {kind === "expense" && (
        <div className="mb-4">
          <div className="mb-1.5 px-1 text-xs font-medium text-muted">Category</div>
          <div className="grid grid-cols-4 gap-2">
            {cats.map((c) => {
              const cat = CATEGORIES[c];
              const on = category === c;
              return (
                <button
                  key={c}
                  onClick={() => {
                    haptic();
                    setCategory(c);
                  }}
                  className={`press flex flex-col items-center gap-1 rounded-2xl border py-2.5 text-[10px] ${
                    on ? "border-brand bg-brand/10 text-ink" : "border-line text-muted"
                  }`}
                >
                  <span className="text-xl">{cat.emoji}</span>
                  {cat.label.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Note */}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)"
        className="mb-5 w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-brand"
      />

      <button
        onClick={submit}
        disabled={amount <= 0 || !merchant.trim()}
        className="press gradient-brand w-full rounded-3xl py-3.5 text-base font-semibold text-white shadow-glow disabled:opacity-40"
      >
        Save {kind === "income" ? "income" : "expense"}
      </button>
      <p className="mt-3 text-center text-[11px] text-faint">
        Saved on your device. Export to Excel or Drive whenever you like.
      </p>
    </Sheet>
  );
}
