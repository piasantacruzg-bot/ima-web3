"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// --- Haptics ------------------------------------------------------

export function haptic(pattern: number | number[] = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* no-op */
    }
  }
}

// --- Count-up money / number animation ----------------------------

function useInView<T extends Element>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function CountUp({
  value,
  duration = 1100,
  format,
  className,
}: {
  value: number;
  duration?: number;
  format: (n: number) => string;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [display, setDisplay] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (!inView) return;
    const start = from.current;
    const delta = value - start;
    let raf = 0;
    let t0: number | null = null;
    const tick = (ts: number) => {
      if (t0 === null) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setDisplay(start + delta * easeOut(p));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={`tnum ${className ?? ""}`}>
      {format(display)}
    </span>
  );
}

// --- Segmented control --------------------------------------------

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={`relative inline-flex rounded-full border border-line bg-surface/60 p-1 ${
        size === "sm" ? "text-xs" : "text-sm"
      }`}
      role="tablist"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => {
              haptic();
              onChange(o.value);
            }}
            className={`press relative z-10 rounded-full px-3.5 py-1.5 font-medium transition-colors ${
              active ? "text-white" : "text-muted hover:text-ink"
            }`}
          >
            {active && (
              <span className="gradient-brand absolute inset-0 -z-10 rounded-full shadow-glow" />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// --- Bottom sheet (mobile-first modal) ----------------------------

export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-5xl border border-line bg-surface p-5 shadow-float safe-b no-scrollbar sm:rounded-5xl sm:animate-scale-in">
        <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-line sm:hidden" />
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="press grid h-9 w-9 place-items-center rounded-full bg-canvas text-muted"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// --- Progress bar -------------------------------------------------

export function ProgressBar({
  value,
  className = "",
  tone = "brand",
}: {
  value: number; // 0..1
  className?: string;
  tone?: "brand" | "warning" | "positive" | "negative";
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const bg =
    tone === "warning"
      ? "bg-warning"
      : tone === "positive"
      ? "bg-positive"
      : tone === "negative"
      ? "bg-negative"
      : "gradient-brand";
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-line ${className}`}>
      <div
        className={`h-full rounded-full ${bg} transition-[width] duration-700 ease-spring`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// --- Section header -----------------------------------------------

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
      {action}
    </div>
  );
}
