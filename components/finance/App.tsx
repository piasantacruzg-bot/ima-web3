"use client";

import { useEffect, useState } from "react";
import { FinanceProvider } from "@/lib/finance/store";
import { TopBar, BottomNav, Fab, type Tab } from "./Chrome";
import { Home } from "./Home";
import { Analytics } from "./Analytics";
import { Activity } from "./Activity";
import { Cards } from "./Cards";
import { TransferSheet } from "./TransferSheet";
import { AddTransactionSheet } from "./AddTransactionSheet";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning ☀️";
  if (h < 18) return "Good afternoon 👋";
  return "Good evening 🌙";
}

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState<string | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 650);
    return () => clearTimeout(t);
  }, []);

  const openTransfer = (fromId?: string) => {
    setTransferFrom(fromId);
    setTransferOpen(true);
  };

  return (
    <FinanceProvider>
      <div className="mx-auto min-h-screen max-w-lg">
        <TopBar greeting={greeting()} />

        {!ready ? (
          <LoadingSkeleton />
        ) : (
          <main key={tab} className="animate-fade-up">
            {tab === "home" && <Home onTransfer={openTransfer} />}
            {tab === "analytics" && <Analytics />}
            {tab === "cards" && <Cards onTransfer={openTransfer} />}
            {tab === "activity" && <Activity />}
          </main>
        )}

        <Fab onClick={() => setAddOpen(true)} />
        <BottomNav active={tab} onChange={setTab} />

        <TransferSheet
          open={transferOpen}
          onClose={() => setTransferOpen(false)}
          initialFromId={transferFrom}
        />
        <AddTransactionSheet open={addOpen} onClose={() => setAddOpen(false)} />
      </div>
    </FinanceProvider>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 px-5 pt-2">
      <div className="skeleton h-52 rounded-5xl" />
      <div className="grid grid-cols-3 gap-3">
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
      </div>
      <div className="flex gap-3">
        <div className="skeleton h-32 w-64 shrink-0" />
        <div className="skeleton h-32 w-64 shrink-0" />
      </div>
      <div className="space-y-3">
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
      </div>
    </div>
  );
}
