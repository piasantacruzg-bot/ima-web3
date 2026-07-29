"use client";

import { useId, useMemo, useState } from "react";

// ============================================================
// Lightweight, dependency-free SVG charts tuned for the design
// system. Everything scales to its container and animates in.
// ============================================================

function buildPath(
  values: number[],
  w: number,
  h: number,
  pad = 2
): { line: string; area: string; points: { x: number; y: number }[] } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = (w - pad * 2) / (values.length - 1 || 1);
  const points = values.map((v, i) => ({
    x: pad + i * step,
    y: pad + (h - pad * 2) * (1 - (v - min) / span),
  }));
  // Smooth Catmull-Rom → cubic bezier
  let line = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    line += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  const area = `${line} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`;
  return { line, area, points };
}

// --- Sparkline ----------------------------------------------------

export function Sparkline({
  values,
  color = "#8b7cff",
  width = 96,
  height = 34,
  strokeWidth = 2,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
}) {
  const id = useId();
  const { line, area } = useMemo(
    () => buildPath(values, width, height, strokeWidth),
    [values, width, height, strokeWidth]
  );
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`sl-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sl-${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// --- Interactive area chart (net worth / balances) ----------------

export function AreaChart({
  values,
  labels,
  color = "#8b7cff",
  height = 180,
  format,
}: {
  values: number[];
  labels?: string[];
  color?: string;
  height?: number;
  format: (n: number) => string;
}) {
  const id = useId();
  const W = 340;
  const H = height;
  const { line, area, points } = useMemo(() => buildPath(values, W, H, 6), [values, H]);
  const [active, setActive] = useState<number | null>(null);

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setActive(nearest);
  };

  const ap = active !== null ? points[active] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        style={{ height }}
        onPointerMove={handleMove}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={`ar-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#ar-${id})`} className="animate-fade-in" />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={1000}
          className="animate-draw-in"
        />
        {ap && (
          <>
            <line x1={ap.x} y1={0} x2={ap.x} y2={H} stroke={color} strokeOpacity={0.25} strokeWidth={1} />
            <circle cx={ap.x} cy={ap.y} r={5.5} fill={color} />
            <circle cx={ap.x} cy={ap.y} r={9} fill={color} fillOpacity={0.25} />
          </>
        )}
      </svg>
      {ap && active !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-xl border border-line bg-elevated px-2.5 py-1.5 text-xs font-semibold shadow-float"
          style={{ left: `${(ap.x / W) * 100}%`, top: 0 }}
        >
          <div className="tnum">{format(values[active])}</div>
          {labels && <div className="text-[10px] font-normal text-muted">{labels[active]}</div>}
        </div>
      )}
    </div>
  );
}

// --- Donut (spending by category) ---------------------------------

export function Donut({
  data,
  size = 176,
  thickness = 22,
  centerLabel,
  centerValue,
  onSlice,
  activeKey,
}: {
  data: { key: string; value: number; color: string; label: string; emoji: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  onSlice?: (key: string | null) => void;
  activeKey?: string | null;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {data.map((d) => {
          const frac = d.value / total;
          const len = frac * c;
          const dash = `${len} ${c - len}`;
          const dashoffset = -offset;
          offset += len;
          const dim = activeKey && activeKey !== d.key;
          return (
            <circle
              key={d.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={activeKey === d.key ? thickness + 5 : thickness}
              strokeDasharray={dash}
              strokeDashoffset={dashoffset}
              strokeLinecap="butt"
              className="cursor-pointer transition-all duration-300 ease-spring"
              style={{ opacity: dim ? 0.28 : 1 }}
              onClick={() => onSlice?.(activeKey === d.key ? null : d.key)}
            />
          );
        })}
      </g>
      {(centerValue || centerLabel) && (
        <g>
          <text
            x="50%"
            y="46%"
            textAnchor="middle"
            className="fill-ink tnum"
            style={{ fontSize: 22, fontWeight: 700 }}
          >
            {centerValue}
          </text>
          <text
            x="50%"
            y="60%"
            textAnchor="middle"
            className="fill-muted"
            style={{ fontSize: 11 }}
          >
            {centerLabel}
          </text>
        </g>
      )}
    </svg>
  );
}

// --- Income vs. expense grouped bars ------------------------------

export function CashflowBars({
  data,
  format,
}: {
  data: { month: string; income: number; expense: number }[];
  format: (n: number) => string;
}) {
  const max = Math.max(...data.flatMap((d) => [d.income, d.expense])) || 1;
  const [active, setActive] = useState<number | null>(null);
  return (
    <div>
      <div className="flex items-end justify-between gap-2" style={{ height: 150 }}>
        {data.map((d, i) => (
          <button
            key={d.month}
            onClick={() => setActive(active === i ? null : i)}
            className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            <div className="relative flex h-full w-full items-end justify-center gap-1">
              {active === i && (
                <div className="absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-elevated px-2 py-1 text-[10px] shadow-float">
                  <span className="text-positive">{format(d.income)}</span>
                  {" · "}
                  <span className="text-negative">{format(d.expense)}</span>
                </div>
              )}
              <div
                className="w-2.5 rounded-full bg-positive/80 transition-all duration-500 ease-spring"
                style={{ height: `${(d.income / max) * 100}%` }}
              />
              <div
                className="w-2.5 rounded-full bg-negative/80 transition-all duration-500 ease-spring"
                style={{ height: `${(d.expense / max) * 100}%` }}
              />
            </div>
            <span className={`text-[10px] ${active === i ? "text-ink" : "text-faint"}`}>
              {d.month}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Progress ring (goals) ----------------------------------------

export function ProgressRing({
  value,
  size = 120,
  thickness = 12,
  color = "#34d399",
  children,
}: {
  value: number; // 0..1
  size?: number;
  thickness?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, value)) * c;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} className="stroke-line" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="transition-[stroke-dasharray] duration-1000 ease-spring"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
