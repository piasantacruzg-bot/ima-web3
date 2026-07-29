"use client";

import { useMemo, useState } from "react";
import { useFinance } from "@/lib/finance/store";
import { CATEGORIES } from "@/lib/finance/data";
import { groupTimeline } from "@/lib/finance/compute";
import { money } from "@/lib/finance/format";
import type { Transaction } from "@/lib/finance/types";
import { Segmented, haptic } from "./ui";

type Filter = "all" | "in" | "out";

export function Activity() {
  const { transactions, accounts, deleteTransaction } = useFinance();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter === "in" && t.amount <= 0) return false;
      if (filter === "out" && t.amount >= 0) return false;
      if (query && !`${t.merchant} ${t.note ?? ""}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [transactions, filter, query]);

  const groups = useMemo(() => groupTimeline(filtered), [filtered]);

  return (
    <div className="px-5 pb-32">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="text-sm text-muted">Every transaction, like a feed.</p>
      </div>

      <div className="sticky top-0 z-20 -mx-5 mb-2 bg-canvas/80 px-5 py-3 backdrop-blur-md">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transactions…"
          className="mb-3 w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <Segmented<Filter>
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { label: "All", value: "all" },
            { label: "Money in", value: "in" },
            { label: "Money out", value: "out" },
          ]}
        />
      </div>

      {groups.length === 0 && (
        <div className="card p-10 text-center text-sm text-muted">No transactions match.</div>
      )}

      <div className="space-y-6">
        {groups.map((g) => {
          const net = g.items.reduce((s, t) => s + (t.currency === "USD" ? t.amount : t.amount / 3.641), 0);
          return (
            <div key={g.bucket}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-muted">{g.bucket}</h2>
                <span className={`text-xs font-medium tnum ${net >= 0 ? "text-positive" : "text-faint"}`}>
                  {net >= 0 ? "+" : "−"}{money(Math.abs(net), "USD", { decimals: 0 }).replace("−", "")}
                </span>
              </div>
              <div className="card divide-y divide-line">
                {g.items.map((t) => (
                  <TxRow
                    key={t.id}
                    tx={t}
                    accountName={accounts.find((a) => a.id === t.accountId)?.name ?? ""}
                    onDelete={() => deleteTransaction(t.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TxRow({
  tx,
  accountName,
  onDelete,
}: {
  tx: Transaction;
  accountName: string;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const cat = CATEGORIES[tx.category];
  const income = tx.amount >= 0;
  return (
    <div>
      <button
        onClick={() => {
          haptic();
          setOpen((o) => !o);
        }}
        className="flex w-full items-center gap-3 p-3.5 text-left"
      >
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg"
          style={{ backgroundColor: cat.color + "22" }}
        >
          {cat.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{tx.merchant}</div>
          <div className="truncate text-[11px] text-faint">
            {new Date(tx.dateISO).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} · {cat.label}
          </div>
        </div>
        <div className={`text-sm font-bold tnum ${income ? "text-positive" : "text-ink"}`}>
          {money(tx.amount, tx.currency, { sign: true })}
        </div>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-spring"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-line bg-canvas/40 px-4 py-3 text-xs">
            <div className="grid grid-cols-2 gap-y-2">
              <Detail label="Account" value={accountName} />
              <Detail label="Category" value={`${cat.emoji} ${cat.label}`} />
              {tx.location && <Detail label="Location" value={tx.location} />}
              <Detail label="Balance after" value={money(tx.balanceAfter, tx.currency)} />
              {tx.note && <Detail label="Note" value={tx.note} full />}
              <Detail label="ID" value={tx.id.slice(0, 14) + "…"} />
              {tx.recurring && <Detail label="Recurring" value="Yes 🔁" />}
            </div>
            <div className="mt-3 flex gap-2">
              <button className="press flex-1 rounded-xl border border-line py-2 text-xs font-medium">🧾 Receipt</button>
              <button
                onClick={onDelete}
                className="press flex-1 rounded-xl bg-negative/10 py-2 text-xs font-medium text-negative"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="text-[10px] uppercase tracking-wide text-faint">{label}</div>
      <div className="font-medium text-ink">{value}</div>
    </div>
  );
}
