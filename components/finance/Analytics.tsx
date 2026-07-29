"use client";

import { useState } from "react";
import { useFinance } from "@/lib/finance/store";
import { money, moneyCompact } from "@/lib/finance/format";
import { AreaChart, CashflowBars, Donut } from "./charts";
import { InsightsFeed } from "./InsightsFeed";
import { Segmented, SectionHeader } from "./ui";

export function Analytics() {
  const { metrics, spendByCategory, netWorthSeries, cashflowSeries, insights } =
    useFinance();
  const [range, setRange] = useState<"1M" | "6M" | "1Y">("1Y");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const totalSpend = spendByCategory.reduce((s, c) => s + c.value, 0);
  const active = spendByCategory.find((c) => c.key === activeCat);

  const nwValues =
    range === "1M"
      ? netWorthSeries.values.slice(-2)
      : range === "6M"
      ? netWorthSeries.values.slice(-6)
      : netWorthSeries.values;
  const hasCashflow = cashflowSeries.some((d) => d.income > 0 || d.expense > 0);

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
          values={nwValues}
          color="#8b7cff"
          height={170}
          format={(n) => money(n, "USD", { decimals: 0 })}
        />
      </section>

      {/* Spending by category — interactive donut */}
      <section className="card p-5">
        <SectionHeader title="Spending this month" />
        {totalSpend === 0 ? (
          <EmptyBlock emoji="🍩" text="No spending yet this month. Add expenses to see the breakdown." />
        ) : (
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
        )}
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
        {hasCashflow ? (
          <CashflowBars data={cashflowSeries} format={(n) => money(n, "USD", { decimals: 0 })} />
        ) : (
          <EmptyBlock emoji="📊" text="Your monthly income vs. expenses will chart here." />
        )}
      </section>

      {/* Summary of this month's activity */}
      {insights.length > 0 && (
        <section>
          <SectionHeader title="This month" />
          <InsightsFeed items={insights} />
        </section>
      )}
    </div>
  );
}

function EmptyBlock({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="py-8 text-center">
      <div className="text-3xl">{emoji}</div>
      <p className="mx-auto mt-2 max-w-[240px] text-sm text-muted">{text}</p>
    </div>
  );
}
