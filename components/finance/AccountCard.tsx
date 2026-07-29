"use client";

import { useState } from "react";
import type { Account, Transaction } from "@/lib/finance/types";
import { money, moneyCompact, pct, shortDate, relativeDue } from "@/lib/finance/format";
import { CATEGORIES } from "@/lib/finance/data";
import { Sparkline } from "./charts";
import { CountUp, ProgressBar, haptic } from "./ui";

export function AccountCard({
  account,
  transactions,
  onTransfer,
}: {
  account: Account;
  transactions: Transaction[];
  onTransfer: (fromId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const recent = transactions.filter((t) => t.accountId === account.id).slice(0, 4);
  const last = recent[0];
  const up = account.monthlyChange >= 0;
  const isCredit = account.type === "credit";
  const displayBalance = isCredit ? Math.abs(account.balance) : account.balance;
  const util =
    isCredit && account.creditLimit
      ? Math.abs(account.balance) / account.creditLimit
      : 0;

  return (
    <div
      className="press card overflow-hidden"
      style={{ boxShadow: open ? "var(--tw-shadow)" : undefined }}
    >
      {/* Card face */}
      <button
        onClick={() => {
          haptic();
          setOpen((o) => !o);
        }}
        className="relative block w-full p-4 text-left"
      >
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: `linear-gradient(135deg, ${account.gradient[0]}, ${account.gradient[1]})`,
          }}
        />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="grid h-11 w-11 place-items-center rounded-2xl text-xl shadow-card"
              style={{
                backgroundImage: `linear-gradient(135deg, ${account.gradient[0]}, ${account.gradient[1]})`,
              }}
            >
              {account.emoji}
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-semibold leading-tight">
                {account.name}
                {account.last4 && (
                  <span className="text-[11px] font-normal text-faint">·· {account.last4}</span>
                )}
              </div>
              <div className="text-xs text-muted">{account.institution}</div>
            </div>
          </div>
          <Sparkline
            values={account.history}
            color={up ? "#34d399" : "#fb7185"}
            width={72}
            height={30}
          />
        </div>

        <div className="relative mt-4 flex items-end justify-between">
          <div>
            <CountUp
              value={displayBalance}
              format={(n) => money(n, account.currency)}
              className="text-2xl font-bold tracking-tight"
            />
            <div className="mt-0.5 flex items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${
                  up ? "bg-positive/12 text-positive" : "bg-negative/12 text-negative"
                }`}
              >
                {up ? "▲" : "▼"} {pct(account.monthlyChange, { sign: false })}
              </span>
              {last && (
                <span className="text-faint">
                  last {money(last.amount, last.currency, { sign: true })}
                </span>
              )}
            </div>
          </div>
          <span
            className="text-faint transition-transform duration-300 ease-spring"
            style={{ transform: open ? "rotate(180deg)" : "none" }}
          >
            ⌄
          </span>
        </div>

        {isCredit && account.creditLimit && (
          <div className="relative mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-muted">
              <span>Utilization {(util * 100).toFixed(0)}%</span>
              <span>limit {moneyCompact(account.creditLimit, account.currency)}</span>
            </div>
            <ProgressBar value={util} tone={util > 0.3 ? "warning" : "brand"} />
          </div>
        )}
      </button>

      {/* Expanded detail */}
      <div
        className="grid transition-[grid-template-rows] duration-400 ease-spring"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-line p-4">
            {isCredit && account.dueDateISO && (
              <div className="mb-3 flex items-center justify-between rounded-2xl bg-warning/10 px-3 py-2 text-sm">
                <span className="text-warning">💳 Statement due</span>
                <span className="font-semibold">
                  {money(account.statementBalance ?? 0, account.currency)} · {relativeDue(account.dueDateISO)}
                </span>
              </div>
            )}

            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
              Recent transactions
            </div>
            <div className="space-y-1">
              {recent.length === 0 && (
                <div className="py-3 text-center text-sm text-muted">No activity yet.</div>
              )}
              {recent.map((t) => {
                const cat = CATEGORIES[t.category];
                return (
                  <div key={t.id} className="flex items-center gap-3 py-1.5">
                    <span
                      className="grid h-8 w-8 place-items-center rounded-xl text-sm"
                      style={{ backgroundColor: cat.color + "22" }}
                    >
                      {cat.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{t.merchant}</div>
                      <div className="text-[11px] text-faint">{shortDate(t.dateISO)} · {cat.label}</div>
                    </div>
                    <div
                      className={`text-sm font-semibold tnum ${
                        t.amount >= 0 ? "text-positive" : "text-ink"
                      }`}
                    >
                      {money(t.amount, t.currency, { sign: true })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  haptic();
                  onTransfer(account.id);
                }}
                className="press gradient-brand rounded-2xl py-2.5 text-sm font-semibold text-white"
              >
                Transfer
              </button>
              <button className="press rounded-2xl border border-line py-2.5 text-sm font-semibold text-ink">
                Insights
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
