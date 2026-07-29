"use client";

import { useFinance } from "@/lib/finance/store";
import { SUBSCRIPTIONS } from "@/lib/finance/data";
import { money, relativeDue, shortDate } from "@/lib/finance/format";
import { AccountCard } from "./AccountCard";
import { DataPanel } from "./MonthlyExport";
import { SectionHeader, haptic } from "./ui";

export function Cards({ onTransfer }: { onTransfer: (fromId?: string) => void }) {
  const { accounts, transactions } = useFinance();
  const wallets = accounts.filter((a) => a.type !== "credit");
  const cards = accounts.filter((a) => a.type === "credit");

  return (
    <div className="space-y-6 px-5 pb-32">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Cards & accounts</h1>
        <p className="text-sm text-muted">Tap any card to expand.</p>
      </div>

      {/* Stacked wallet visual */}
      <section>
        <div className="relative" style={{ height: 210 }}>
          {[...cards, ...wallets].slice(0, 4).map((a, i) => (
            <div
              key={a.id}
              className="press absolute inset-x-0 overflow-hidden rounded-4xl p-5 text-white shadow-float"
              style={{
                top: i * 46,
                zIndex: i,
                backgroundImage: `linear-gradient(135deg, ${a.gradient[0]}, ${a.gradient[1]})`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{a.emoji} {a.name}</span>
                <span className="text-[11px] text-white/70">{a.currency}</span>
              </div>
              <div className="mt-6 flex items-end justify-between">
                <div>
                  <div className="text-[10px] text-white/60">
                    {a.type === "credit" ? "Balance owed" : "Available"}
                  </div>
                  <div className="text-xl font-bold tnum">{money(Math.abs(a.balance), a.currency)}</div>
                </div>
                {a.last4 && <div className="text-sm tracking-widest text-white/80">·· {a.last4}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="All accounts" />
        <div className="stagger space-y-3">
          {accounts.map((a) => (
            <AccountCard key={a.id} account={a} transactions={transactions} onTransfer={(id) => onTransfer(id)} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Subscriptions" />
        <div className="card divide-y divide-line">
          {SUBSCRIPTIONS.length === 0 && (
            <div className="p-6 text-center text-sm text-muted">
              No subscriptions tracked yet.
            </div>
          )}
          {SUBSCRIPTIONS.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-canvas text-lg">{s.emoji}</span>
              <div className="flex-1">
                <div className="text-sm font-medium">{s.name}</div>
                <div className="text-[11px] text-faint">{s.cadence} · next {shortDate(s.nextChargeISO)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold tnum">{money(s.amount, s.currency)}</div>
                <div className="text-[11px] text-warning">{relativeDue(s.nextChargeISO)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <DataPanel />
    </div>
  );
}

