"use client";

import { useFinance } from "@/lib/finance/store";
import { BILLS, SUBSCRIPTIONS } from "@/lib/finance/data";
import { money, moneyCompact, pct, relativeDue, shortDate } from "@/lib/finance/format";
import { AccountCard } from "./AccountCard";
import { AreaChart } from "./charts";
import { InsightsCarousel } from "./InsightsFeed";
import { MonthlyExportCard } from "./MonthlyExport";
import { CountUp, SectionHeader } from "./ui";

export function Home({ onTransfer }: { onTransfer: (fromId?: string) => void }) {
  const { accounts, transactions, metrics, netWorthSeries, insights } = useFinance();
  const nw = netWorthSeries.values;
  const prevNw = nw[nw.length - 2] ?? 0;
  const lastNw = nw[nw.length - 1] ?? 0;
  const momChange = prevNw !== 0 ? (lastNw - prevNw) / Math.abs(prevNw) : 0;
  const showMom = prevNw !== 0 && Math.abs(lastNw - prevNw) > 0.5;
  const creditAccounts = accounts.filter((a) => a.type === "credit");

  return (
    <div className="space-y-7 pb-32">
      {/* Net worth hero */}
      <section className="px-5">
        <div className="relative overflow-hidden rounded-5xl gradient-brand p-6 text-white shadow-glow">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/80">Total Net Worth</span>
              {showMom && (
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
                  {momChange >= 0 ? "▲" : "▼"} {pct(momChange, { sign: false })} this month
                </span>
              )}
            </div>
            <CountUp
              value={metrics.netWorth}
              duration={1400}
              format={(n) => money(n, "USD", { decimals: 0 })}
              className="mt-1 block text-[42px] font-bold leading-tight tracking-tight"
            />
            <div className="mt-3 -mx-2">
              <AreaChart
                values={nw}
                color="#ffffff"
                height={90}
                format={(n) => money(n, "USD", { decimals: 0 })}
                labels={netWorthSeries.labels}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <HeroStat label="Cash" value={moneyCompact(metrics.cash, "USD")} />
              <HeroStat label="Assets" value={moneyCompact(metrics.assets, "USD")} />
              <HeroStat label="Debt" value={moneyCompact(metrics.debt, "USD")} />
            </div>
          </div>
        </div>
      </section>

      {/* Spending snapshot */}
      <section className="px-5">
        <div className="grid grid-cols-3 gap-3">
          <SpendStat label="Today" value={metrics.spentToday} accent="#fb7185" />
          <SpendStat label="This week" value={metrics.spentWeek} accent="#fbbf24" />
          <SpendStat label="This month" value={metrics.spentMonth} accent="#8b7cff" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <FlowCard
            label="Saved this month"
            value={metrics.savedMonth}
            positive={metrics.savedMonth >= 0}
            sub={`of ${money(metrics.incomeMonth, "USD", { decimals: 0 })} income`}
          />
          <FlowCard
            label="Monthly cash flow"
            value={metrics.cashFlow}
            positive={metrics.cashFlow >= 0}
            sub={metrics.cashFlow >= 0 ? "You're net positive" : "Spending exceeds income"}
          />
        </div>
      </section>

      {/* End-of-month export prompt */}
      <section className="px-5">
        <MonthlyExportCard />
      </section>

      {/* Insights */}
      <section>
        <SectionHeader title="Smart insights" />
        <InsightsCarousel items={insights} />
      </section>

      {/* Accounts */}
      <section className="px-5">
        <SectionHeader
          title="Accounts"
          action={
            <button onClick={() => onTransfer()} className="press text-xs font-semibold text-brand-light">
              Transfer →
            </button>
          }
        />
        <div className="stagger space-y-3">
          {accounts.map((a) => (
            <AccountCard key={a.id} account={a} transactions={transactions} onTransfer={(id) => onTransfer(id)} />
          ))}
        </div>
      </section>

      {/* Upcoming */}
      <section className="px-5">
        <SectionHeader title="Upcoming bills" />
        <div className="card divide-y divide-line">
          {BILLS.length === 0 && (
            <div className="p-6 text-center text-sm text-muted">
              No upcoming bills yet. 🎉
            </div>
          )}
          {BILLS.map((b) => {
            const days = relativeDue(b.dueDateISO);
            const soon = days.includes("today") || days.includes("tomorrow");
            return (
              <div key={b.id} className="flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-canvas text-lg">{b.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{b.name}</div>
                  <div className="text-[11px] text-faint">
                    {shortDate(b.dueDateISO)}
                    {b.autopay && <span className="ml-1.5 text-positive">· autopay</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tnum">{money(b.amount, b.currency)}</div>
                  <div className={`text-[11px] ${soon ? "text-warning" : "text-faint"}`}>{days}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Credit card due + subscriptions */}
      <section className="px-5">
        <SectionHeader title="Cards & subscriptions" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {creditAccounts.map((a) => {
            const owed = Math.max(-a.balance, 0);
            return (
              <div key={a.id} className="card overflow-hidden p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">💳 {a.name}</span>
                  {owed > 0 && a.dueDateISO && (
                    <span className="rounded-full bg-warning/12 px-2 py-0.5 text-[11px] font-semibold text-warning">
                      {relativeDue(a.dueDateISO)}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-2xl font-bold tnum">{money(owed, a.currency)}</div>
                <div className="text-[11px] text-faint">
                  {owed > 0 ? "Current balance owed" : "No balance owed 🎉"}
                </div>
              </div>
            );
          })}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">🔁 Subscriptions</span>
              <span className="text-[11px] text-faint">{SUBSCRIPTIONS.length} active</span>
            </div>
            {SUBSCRIPTIONS.length === 0 ? (
              <p className="mt-3 text-[11px] text-muted">No subscriptions tracked yet.</p>
            ) : (
              <>
                <div className="mt-3 flex -space-x-1.5">
                  {SUBSCRIPTIONS.map((s) => (
                    <span
                      key={s.id}
                      title={s.name}
                      className="grid h-8 w-8 place-items-center rounded-xl border border-surface bg-canvas text-base"
                    >
                      {s.emoji}
                    </span>
                  ))}
                </div>
                <div className="mt-3 text-[11px] text-muted">
                  Next: <span className="font-medium text-ink">{SUBSCRIPTIONS[0].name}</span> {money(SUBSCRIPTIONS[0].amount, SUBSCRIPTIONS[0].currency)} · {relativeDue(SUBSCRIPTIONS[0].nextChargeISO)}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/12 py-2">
      <div className="text-[10px] font-medium text-white/70">{label}</div>
      <div className="text-sm font-bold tnum">{value}</div>
    </div>
  );
}

function SpendStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
        <span className="text-[11px] font-medium text-muted">{label}</span>
      </div>
      <CountUp
        value={value}
        format={(n) => money(n, "USD", { decimals: 0 })}
        className="mt-1.5 block text-lg font-bold tracking-tight"
      />
      <div className="text-[10px] text-faint">spent</div>
    </div>
  );
}

function FlowCard({
  label,
  value,
  positive,
  sub,
}: {
  label: string;
  value: number;
  positive: boolean;
  sub: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-[11px] font-medium text-muted">{label}</div>
      <CountUp
        value={Math.abs(value)}
        format={(n) => (positive ? "+" : "−") + money(n, "USD", { decimals: 0 }).replace("−", "")}
        className={`mt-1 block text-xl font-bold tracking-tight ${positive ? "text-positive" : "text-negative"}`}
      />
      <div className="mt-0.5 text-[11px] text-faint">{sub}</div>
    </div>
  );
}
