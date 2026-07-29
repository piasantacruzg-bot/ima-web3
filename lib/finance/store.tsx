"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Account, Transaction } from "./types";
import { ACCOUNTS, TRANSACTIONS, FEE_RULES } from "./data";
import { convert } from "./format";
import {
  computeMetrics,
  computeSpendByCategory,
  liveAccounts,
} from "./compute";

// ============================================================
// Client store + sync engine.
// - Transactions live in React state and localStorage (offline-first).
// - Every mutation is queued and flushed to /api/sync (Google Drive).
// - Sync status surfaces as 🟢 synced / 🟡 pending / 🔴 error.
// ============================================================

export type SyncStatus = "synced" | "pending" | "error" | "offline";

type Mutation =
  | { op: "create"; tx: Transaction }
  | { op: "update"; tx: Transaction }
  | { op: "delete"; id: string };

interface Persisted {
  userTx: Transaction[];
  queue: Mutation[];
}

const LS_KEY = "aura-finance-v1";

function loadPersisted(): Persisted {
  if (typeof window === "undefined") return { userTx: [], queue: [] };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { userTx: [], queue: [] };
    const parsed = JSON.parse(raw) as Persisted;
    return { userTx: parsed.userTx ?? [], queue: parsed.queue ?? [] };
  } catch {
    return { userTx: [], queue: [] };
  }
}

function savePersisted(p: Persisted) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    /* storage full / unavailable */
  }
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `tx_${crypto.randomUUID()}`;
  }
  return `tx_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

// --- Reducer ------------------------------------------------------

interface State {
  userTx: Transaction[];
  queue: Mutation[];
}

type Action =
  | { type: "hydrate"; payload: Persisted }
  | { type: "create"; tx: Transaction }
  | { type: "update"; tx: Transaction }
  | { type: "delete"; id: string }
  | { type: "flushed" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { userTx: action.payload.userTx, queue: action.payload.queue };
    case "create":
      return {
        userTx: [action.tx, ...state.userTx],
        queue: [...state.queue, { op: "create", tx: action.tx }],
      };
    case "update":
      return {
        userTx: state.userTx.map((t) => (t.id === action.tx.id ? action.tx : t)),
        queue: [...state.queue, { op: "update", tx: action.tx }],
      };
    case "delete":
      return {
        userTx: state.userTx.filter((t) => t.id !== action.id),
        queue: [...state.queue, { op: "delete", id: action.id }],
      };
    case "flushed":
      return { ...state, queue: [] };
    default:
      return state;
  }
}

// --- Context ------------------------------------------------------

interface StoreValue {
  accounts: Account[];
  transactions: Transaction[]; // seed + user, newest first
  userTransactions: Transaction[]; // user-added only (the sync snapshot)
  metrics: ReturnType<typeof computeMetrics>;
  spendByCategory: ReturnType<typeof computeSpendByCategory>;
  feeRules: typeof FEE_RULES;
  syncStatus: SyncStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  driveConnected: boolean;
  addTransaction: (input: NewTransaction) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  retrySync: () => void;
}

export interface NewTransaction {
  accountId: string;
  merchant: string;
  category: Transaction["category"];
  amount: number; // signed
  note?: string;
  dateISO?: string;
  destinationAccountId?: string;
  transferFee?: number;
}

const StoreCtx = createContext<StoreValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { userTx: [], queue: [] });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [driveConnected, setDriveConnected] = useState(false);
  const flushing = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempt = useRef(0);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    dispatch({ type: "hydrate", payload: loadPersisted() });
    // Probe whether Drive is configured (does not require the user to be online).
    fetch("/api/sync", { method: "GET" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setDriveConnected(Boolean(d.connected));
          if (d.lastSyncedAt) setLastSyncedAt(d.lastSyncedAt);
        }
      })
      .catch(() => setDriveConnected(false));
  }, []);

  // Persist on every change.
  useEffect(() => {
    savePersisted({ userTx: state.userTx, queue: state.queue });
  }, [state.userTx, state.queue]);

  // Flush queue to the server (Drive). Retries with backoff on failure.
  const flush = useCallback(async () => {
    if (flushing.current) return;
    if (state.queue.length === 0) {
      setSyncStatus("synced");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSyncStatus("offline");
      return;
    }
    flushing.current = true;
    setSyncStatus("pending");
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mutations: state.queue, snapshot: state.userTx }),
      });
      if (!res.ok) throw new Error(`sync ${res.status}`);
      const data = await res.json().catch(() => ({}));
      dispatch({ type: "flushed" });
      attempt.current = 0;
      setSyncStatus("synced");
      setDriveConnected(Boolean(data.connected));
      const ts = data.syncedAt ?? new Date().toISOString();
      setLastSyncedAt(ts);
    } catch {
      // Keep the queue; surface error and schedule a retry with backoff.
      attempt.current += 1;
      setSyncStatus(navigator.onLine ? "error" : "offline");
      const delay = Math.min(2000 * 2 ** (attempt.current - 1), 30_000);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => {
        flushing.current = false;
        flush();
      }, delay);
      return;
    } finally {
      flushing.current = false;
    }
  }, [state.queue, state.userTx]);

  // Auto-flush whenever the queue grows.
  useEffect(() => {
    if (state.queue.length > 0) flush();
    else setSyncStatus((s) => (s === "offline" ? s : "synced"));
  }, [state.queue, flush]);

  // React to connectivity changes: sync as soon as we're back online.
  useEffect(() => {
    const onOnline = () => {
      attempt.current = 0;
      flush();
    };
    const onOffline = () => setSyncStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (typeof navigator !== "undefined" && !navigator.onLine) setSyncStatus("offline");
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [flush]);

  // --- Mutations --------------------------------------------------

  const addTransaction = useCallback((input: NewTransaction) => {
    const account = ACCOUNTS.find((a) => a.id === input.accountId)!;
    const tx: Transaction = {
      id: uid(),
      accountId: input.accountId,
      merchant: input.merchant,
      category: input.category,
      amount: input.amount,
      currency: account.currency,
      dateISO: input.dateISO ?? new Date().toISOString(),
      note: input.note,
      balanceAfter: account.balance + input.amount,
    };
    dispatch({ type: "create", tx });
    // If this is a transfer, mirror the credit into the destination account
    // (converting across currencies at the reference rate).
    if (input.destinationAccountId) {
      const dest = ACCOUNTS.find((a) => a.id === input.destinationAccountId);
      if (dest) {
        const received = convert(Math.abs(input.amount), account.currency, dest.currency);
        const credit: Transaction = {
          id: uid(),
          accountId: dest.id,
          merchant: `Transfer from ${account.name}`,
          category: "transfer",
          amount: received,
          currency: dest.currency,
          dateISO: tx.dateISO,
          balanceAfter: dest.balance + received,
        };
        dispatch({ type: "create", tx: credit });
      }
    }
  }, []);

  const updateTransaction = useCallback((tx: Transaction) => {
    dispatch({ type: "update", tx });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    dispatch({ type: "delete", id });
  }, []);

  const retrySync = useCallback(() => {
    attempt.current = 0;
    flush();
  }, [flush]);

  // --- Derived ----------------------------------------------------

  const transactions = useMemo(
    () =>
      [...state.userTx, ...TRANSACTIONS].sort(
        (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
      ),
    [state.userTx]
  );
  const accounts = useMemo(() => liveAccounts(ACCOUNTS, state.userTx), [state.userTx]);
  const metrics = useMemo(() => computeMetrics(accounts, transactions), [accounts, transactions]);
  const spendByCategory = useMemo(() => computeSpendByCategory(transactions), [transactions]);

  const value: StoreValue = {
    accounts,
    transactions,
    userTransactions: state.userTx,
    metrics,
    spendByCategory,
    feeRules: FEE_RULES,
    syncStatus,
    pendingCount: state.queue.length,
    lastSyncedAt,
    driveConnected,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    retrySync,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useFinance(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}
