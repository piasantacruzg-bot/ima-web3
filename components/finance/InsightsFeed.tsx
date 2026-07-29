"use client";

import type { Insight, InsightTone } from "@/lib/finance/types";

const TONE: Record<InsightTone, { ring: string; chip: string }> = {
  positive: { ring: "border-positive/30", chip: "bg-positive/12 text-positive" },
  warning: { ring: "border-warning/30", chip: "bg-warning/12 text-warning" },
  neutral: { ring: "border-line", chip: "bg-brand/12 text-brand-light" },
};

const label = (tone: InsightTone) =>
  tone === "positive" ? "Good" : tone === "warning" ? "Heads up" : "Info";

export function InsightsFeed({ items }: { items: Insight[] }) {
  if (items.length === 0) {
    return (
      <div className="card p-6 text-center">
        <div className="text-2xl">💡</div>
        <p className="mt-2 text-sm text-muted">
          Insights appear here as you add income and expenses.
        </p>
      </div>
    );
  }
  return (
    <div className="stagger space-y-2.5">
      {items.map((i) => {
        const tone = TONE[i.tone];
        return (
          <div key={i.id} className={`press card flex items-start gap-3 border p-4 ${tone.ring}`}>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-canvas text-xl">
              {i.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{i.title}</h3>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${tone.chip}`}>
                  {label(i.tone)}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{i.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Horizontal, swipeable version for the Home screen.
export function InsightsCarousel({ items }: { items: Insight[] }) {
  if (items.length === 0) {
    return (
      <div className="px-5">
        <div className="card flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-canvas text-xl">💡</span>
          <p className="text-xs leading-relaxed text-muted">
            Add your first transactions and you'll see insights here — top
            categories, savings, card utilization and more.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 no-scrollbar">
      {items.map((i) => {
        const tone = TONE[i.tone];
        return (
          <div key={i.id} className={`press card w-64 shrink-0 snap-start border p-4 ${tone.ring}`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-canvas text-lg">{i.emoji}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${tone.chip}`}>
                {label(i.tone)}
              </span>
            </div>
            <h3 className="text-sm font-semibold">{i.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted line-clamp-3">{i.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
