"use client";

import { useState } from "react";
import { useFinance } from "@/lib/finance/store";
import {
  CASHFLOW_SERIES,
  NET_WORTH_SERIES,
  SAVINGS_GOAL,
  ACCOUNTS,
} from "@/lib/finance/data";
import { money, moneyCompact, pct } from "@/lib/finance/format";
import { AreaChart, CashflowBars, Donut, ProgressRing } from "./charts";
import { InsightsFeed } from "./InsightsFeed";
import { Segmented, SectionHeader } from "./ui";

export function Analytics() {
  const { metrics, spendByCategory } = useFinance();
  const [range, setRange] = useState<"1M" | "6M" | "1Y">("1Y");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const totalSpend = spendByCategory.reduce((s, c) => s + c.value, 0);
  const active = spendByCategory.find((c) => c.key === activeCat);

  const debtAccounts = ACCOUNTS.filter((a) => a.type === "credit");
  const totalDebt = metrics.debt;

  return (
    <div className="space-y-6 px-5 pb-32">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        <p className="text-sm text-muted">Understand where your money goes.</p>
      </div>

      {/* Net worth over time */}
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted">Net worth</div>
            <div className="text-2xl font-bold tracking-tight tnum">{money(metrics.netWorth, "USD", { decimals: 0 })}</div>
          </div>
          <Segmented<"1M" | "6M" | "1Y">
            size="sm"
            value={range}
            onChange={setRange}
            options={[
              { label: "1M", value: "1M" },
              { label: "6M", value: "6M" },
              { label: "1Y", value: "1Y" },
            ]}
          />
        </div>
        <AreaChart
          values={
            range === "1M"
              ? NET_WORTH_SERIES.slice(-2)
              : range === "6M"
              ? NET_WORTH_SERIES.slice(-6)
              : NET_WORTH_SERIES
          }
          color="#8b7cff"
          height={170}
          format={(n) => money(n, "USD", { decimals: 0 })}
        />
      </section>

      {/* Spending by category — interactive donut */}
      <section className="card p-5">
        <SectionHeader title="Spending this month" />
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <Donut
            data={spendByCategory}
            activeKey={activeCat}
            onSlice={setActiveCat}
            centerValue={active ? moneyCompact(active.value, "USD") : moneyCompact(totalSpend, "USD")}
            centerLabel={active ? active.label : "total"}
          />
          <div className="w-full flex-1 space-y-1.5">
            {spendByCategory.map((c) => {
              const share = c.value / totalSpend;
              const on = activeCat === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setActiveCat(on ? null : c.key)}
                  className={`press flex w-full items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors ${
                    on ? "bg-canvas" : ""
                  }`}
                  style={{ opacity: activeCat && !on ? 0.5 : 1 }}
                >
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-lg">{c.emoji}</span>
                  <span className="flex-1 text-left text-sm font-medium">{c.label}</span>
                  <span className="text-sm font-semibold tnum">{money(c.value, "USD", { decimals: 0 })}</span>
                  <span className="w-9 text-right text-[11px] text-faint">{(share * 100).toFixed(0)}%</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Income vs expense */}
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <SectionHeader title="Income vs. expenses" />
          <div className="flex gap-3 text-[11px]">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-positive" />Income</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-negative" />Expense</span>
          </div>
        </div>
        <CashflowBars data={CASHFLOW_SERIES} format={(n) => money(n, "USD", { decimals: 0 })} />
      </section>

      {/* Savings goal + debt payoff */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="card flex flex-col items-center p-5">
          <SectionHeader title="Savings goal" />
          <ProgressRing value={SAVINGS_GOAL.saved / SAVINGS_GOAL.target} size={130} color="#34d399">
            <div className="text-center">
              <div className="text-xl font-bold tnum">
                {((SAVINGS_GOAL.saved / SAVINGS_GOAL.target) * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] text-muted">{SAVINGS_GOAL.label}</div>
            </div>
          </ProgressRing>
          <div className="mt-3 text-center text-sm">
            <span className="font-semibold">{money(SAVINGS_GOAL.saved, "USD", { decimals: 0 })}</span>
            <span className="text-muted"> of {money(SAVINGS_GOAL.target, "USD", { decimals: 0 })}</span>
          </div>
        </section>

        <section className="card p-5">
          <SectionHeader title="Debt payoff" />
          <div className="text-2xl font-bold tracking-tight tnum text-negative">
            {money(totalDebt, "USD", { decimals: 0 })}
          </div>
          <div className="text-[11px] text-faint">across {debtAccounts.length} credit line{debtAccounts.length > 1 ? "s" : ""}</div>
          <div className="mt-3 space-y-2">
            {debtAccounts.map((a) => {
              const util = a.creditLimit ? Math.abs(a.balance) / a.creditLimit : 0;
              return (
                <div key={a.id}>
                  <div className="flex justify-between text-xs">
                    <span>{a.name}</span>
                    <span className="tnum">{money(Math.abs(a.balance), a.currency, { decimals: 0 })}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-negative" style={{ width: `${util * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 rounded-2xl bg-positive/10 px-3 py-2 text-[11px] text-positive">
            Pay {money(320, "USD", { decimals: 0 })}/mo → debt-free in ~6 months.
          </div>
        </section>
      </div>

      {/* All insights */}
      <section>
        <SectionHeader title="All insights" />
        <InsightsFeed />
      </section>
    </div>
  );
}
