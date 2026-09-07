"use client";

import { useCallback, useEffect, useState } from "react";
import { Entry } from "@/lib/types";
import EntryForm from "@/components/EntryForm";
import EntriesTable from "@/components/EntriesTable";

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  // Carga inicial rapida desde la sheet.
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/entries", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar");
      setEntries(data.entries);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-analiza cada link y actualiza la master sheet.
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar");
      setEntries(data.entries);
      setLastRefresh(data.refreshedAt);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Al abrir la pagina: carga y luego refresca metricas automaticamente.
  useEffect(() => {
    (async () => {
      await load();
      await refresh();
    })();
  }, [load, refresh]);

  const totalVistas = entries.reduce((s, e) => s + (e.vistas || 0), 0);
  const totalReacciones = entries.reduce((s, e) => s + (e.reacciones || 0), 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            IMA <span className="text-brand">WEB3</span> · Reportes
          </h1>
          <p className="text-sm text-slate-500">
            Registra publicaciones y actualiza sus metricas automaticamente.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="rounded-lg border border-brand bg-white px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand hover:text-white disabled:opacity-50"
        >
          {refreshing ? "Actualizando metricas..." : "↻ Actualizar metricas"}
        </button>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Publicaciones" value={entries.length.toString()} />
        <Stat label="Vistas totales" value={fmt(totalVistas)} />
        <Stat label="Reacciones totales" value={fmt(totalReacciones)} />
        <Stat
          label="Ultima sync"
          value={
            lastRefresh
              ? new Date(lastRefresh).toLocaleTimeString("es-MX", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"
          }
        />
      </section>

      <div className="mb-6">
        <EntryForm onAdded={refresh} />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Cargando...
        </div>
      ) : (
        <EntriesTable entries={entries} />
      )}

      <footer className="mt-8 text-center text-xs text-slate-400">
        Los datos se guardan en tu master sheet de Google Drive.
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function fmt(n: number): string {
  return new Intl.NumberFormat("es-MX").format(n || 0);
}
