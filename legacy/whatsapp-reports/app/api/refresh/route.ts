import { NextResponse } from "next/server";
import { getEntries, replaceAllEntries } from "@/lib/sheets";
import { fetchMetrics } from "@/lib/metrics";
import { Entry } from "@/lib/types";

export const dynamic = "force-dynamic";
// El fetch a cada link puede tardar; ampliamos el limite.
export const maxDuration = 60;

/** Corre tareas async con un limite de concurrencia. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length))
    .fill(0)
    .map(async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await fn(items[idx]);
      }
    });
  await Promise.all(workers);
  return results;
}

export async function POST() {
  try {
    const entries = await getEntries();

    const updated = await mapLimit<Entry, Entry>(entries, 5, async (entry) => {
      try {
        const m = await fetchMetrics(entry);
        if (m.automatico) {
          return {
            ...entry,
            vistas: m.vistas,
            reacciones: m.reacciones,
            // mantenemos suscriptores previos si el fetch devolvio 0
            suscriptores: m.suscriptores || entry.suscriptores,
            ultimaActualizacion: new Date().toISOString(),
          };
        }
        return entry;
      } catch {
        return entry;
      }
    });

    await replaceAllEntries(updated);
    return NextResponse.json({ entries: updated, refreshedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
