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
// Client store.
// - Transactions live in React state and localStorage (offline-first).
// - Nothing is pushed to Google Drive automatically. The user exports
//   (download or save-to-Drive) on demand — e.g. at the end of the month.
// ============================================================

export type SaveStatus = "saved" | "saving";

const LS_KEY = "aura-finance-v1";

function loadUserTx(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Back-compat with the earlier { userTx, queue } shape.
    if (Array.isArray(parsed)) return parsed;
    return Array.isArray(parsed.userTx) ? parsed.userTx : [];
  } catch {
    return [];
  }
}

function saveUserTx(userTx: Transaction[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ userTx }));
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

type Action =
  | { type: "hydrate"; payload: Transaction[] }
  | { type: "create"; tx: Transaction }
  | { type: "update"; tx: Transaction }
  | { type: "delete"; id: string };

function reducer(state: Transaction[], action: Action): Transaction[] {
  switch (action.type) {
    case "hydrate":
      return action.payload;
    case "create":
      return [action.tx, ...state];
    case "update":
      return state.map((t) => (t.id === action.tx.id ? action.tx : t));
    case "delete":
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

// --- Context ------------------------------------------------------

interface StoreValue {
  accounts: Account[];
  transactions: Transaction[]; // seed + user, newest first
  userTransactions: Transaction[]; // user-added only (the export snapshot)
  metrics: ReturnType<typeof computeMetrics>;
  spendByCategory: ReturnType<typeof computeSpendByCategory>;
  feeRules: typeof FEE_RULES;
  saveStatus: SaveStatus;
  driveConnected: boolean;
  lastExportedAt: string | null;
  addTransaction: (input: NewTransaction) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  /** Manually build & upload the current month's workbook to Drive. */
  exportMonthToDrive: () => Promise<{ ok: boolean; connected: boolean }>;
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
  const [userTx, dispatch] = useReducer(reducer, []);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [driveConnected, setDriveConnected] = useState(false);
  const [lastExportedAt, setLastExportedAt] = useState<string | null>(null);
  const firstRender = useRef(true);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    dispatch({ type: "hydrate", payload: loadUserTx() });
    // Probe whether Drive is configured (for the manual export option).
    fetch("/api/sync", { method: "GET" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setDriveConnected(Boolean(d.connected)))
      .catch(() => setDriveConnected(false));
  }, []);

  // Persist locally on every change (this is the only automatic write).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveStatus("saving");
    saveUserTx(userTx);
    const t = setTimeout(() => setSaveStatus("saved"), 350);
    return () => clearTimeout(t);
  }, [userTx]);

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
    // Mirror a transfer's credit into the destination account.
    if (input.destinationAccountId) {
      const dest = ACCOUNTS.find((a) => a.id === input.destinationAccountId);
      if (dest) {
        const received = convert(Math.abs(input.amount), account.currency, dest.currency);
        dispatch({
          type: "create",
          tx: {
            id: uid(),
            accountId: dest.id,
            merchant: `Transfer from ${account.name}`,
            category: "transfer",
            amount: received,
            currency: dest.currency,
            dateISO: tx.dateISO,
            balanceAfter: dest.balance + received,
          },
        });
      }
    }
  }, []);

  const updateTransaction = useCallback((tx: Transaction) => {
    dispatch({ type: "update", tx });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    dispatch({ type: "delete", id });
  }, []);

  const exportMonthToDrive = useCallback(async () => {
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ snapshot: userTx }),
      });
      if (!res.ok) return { ok: false, connected: driveConnected };
      const data = await res.json().catch(() => ({}));
      setDriveConnected(Boolean(data.connected));
      if (data.connected) setLastExportedAt(data.syncedAt ?? new Date().toISOString());
      return { ok: true, connected: Boolean(data.connected) };
    } catch {
      return { ok: false, connected: driveConnected };
    }
  }, [userTx, driveConnected]);

  // --- Derived ----------------------------------------------------

  const transactions = useMemo(
    () =>
      [...userTx, ...TRANSACTIONS].sort(
        (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
      ),
    [userTx]
  );
  const accounts = useMemo(() => liveAccounts(ACCOUNTS, userTx), [userTx]);
  const metrics = useMemo(() => computeMetrics(accounts, transactions), [accounts, transactions]);
  const spendByCategory = useMemo(() => computeSpendByCategory(transactions), [transactions]);

  const value: StoreValue = {
    accounts,
    transactions,
    userTransactions: userTx,
    metrics,
    spendByCategory,
    feeRules: FEE_RULES,
    saveStatus,
    driveConnected,
    lastExportedAt,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    exportMonthToDrive,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useFinance(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}
