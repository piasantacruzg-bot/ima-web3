"use client";

import { useEffect, useState } from "react";
import { useFinance } from "@/lib/finance/store";
import { haptic } from "./ui";

// --- Theme toggle -------------------------------------------------

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  const toggle = () => {
    haptic();
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("aura-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="press glass grid h-10 w-10 place-items-center rounded-full text-lg"
    >
      <span className="transition-transform duration-500 ease-spring" style={{ transform: dark ? "rotate(0)" : "rotate(360deg)" }}>
        {dark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}

// --- Local save badge ---------------------------------------------
// Nothing auto-syncs to Drive; this reflects the local save state only.

export function SyncBadge() {
  const { saveStatus, lastExportedAt } = useFinance();
  const saving = saveStatus === "saving";
  return (
    <div
      className="glass flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium"
      title={
        lastExportedAt
          ? `Saved on this device · last exported ${new Date(lastExportedAt).toLocaleTimeString()}`
          : "Saved on this device — export whenever you like"
      }
    >
      <span className="relative grid place-items-center">
        {saving && <span className="absolute h-2.5 w-2.5 animate-pulse-ring rounded-full bg-warning" />}
        <span className={`h-2.5 w-2.5 rounded-full ${saving ? "bg-warning" : "bg-positive"}`} />
      </span>
      <span className="text-muted">{saving ? "Saving" : "Saved"}</span>
    </div>
  );
}

// --- Top bar ------------------------------------------------------

export function TopBar({ greeting }: { greeting: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
      <div>
        <p className="text-xs font-medium text-muted">{greeting}</p>
        <h1 className="text-lg font-bold tracking-tight">My Money</h1>
      </div>
      <div className="flex items-center gap-2">
        <SyncBadge />
        <ThemeToggle />
      </div>
    </header>
  );
}

// --- Bottom navigation --------------------------------------------

export type Tab = "home" | "analytics" | "activity" | "cards";

const NAV: { tab: Tab; label: string; icon: (a: boolean) => React.ReactNode }[] = [
  { tab: "home", label: "Home", icon: (a) => <NavIcon active={a} path="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" /> },
  { tab: "analytics", label: "Insights", icon: (a) => <NavIcon active={a} path="M4 20V10M10 20V4M16 20v-7M22 20H2" /> },
  { tab: "cards", label: "Cards", icon: (a) => <NavIcon active={a} path="M3 7h18v10H3zM3 10h18" /> },
  { tab: "activity", label: "Activity", icon: (a) => <NavIcon active={a} path="M4 12h4l2 6 4-14 2 8h4" /> },
];

function NavIcon({ active, path }: { active: boolean; path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.4 : 1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

export function BottomNav({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="glass pointer-events-auto flex items-center gap-1 rounded-full px-2 py-2 shadow-float">
        {NAV.map((n) => {
          const on = active === n.tab;
          return (
            <button
              key={n.tab}
              onClick={() => {
                haptic();
                onChange(n.tab);
              }}
              aria-label={n.label}
              className={`press relative flex flex-col items-center gap-0.5 rounded-full px-4 py-1.5 transition-colors ${
                on ? "text-brand-light" : "text-muted"
              }`}
            >
              {on && (
                <span className="absolute inset-0 -z-10 rounded-full bg-brand/12" />
              )}
              {n.icon(on)}
              <span className="text-[9px] font-medium">{n.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// --- Floating action button ---------------------------------------

export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={() => {
        haptic([12, 6, 12]);
        onClick();
      }}
      aria-label="Add transaction"
      className="press gradient-brand fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full text-2xl text-white shadow-glow"
    >
      <span className="animate-float">＋</span>
    </button>
  );
}
