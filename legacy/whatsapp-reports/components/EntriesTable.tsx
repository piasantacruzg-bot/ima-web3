"use client";

import { Entry } from "@/lib/types";

interface Props {
  entries: Entry[];
}

function fmt(n: number): string {
  return new Intl.NumberFormat("es-MX").format(n || 0);
}

function fmtFecha(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EntriesTable({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        Aun no hay publicaciones registradas. Agrega la primera con el formulario
        de arriba.
      </div>
    );
  }

  const th =
    "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";
  const td = "px-3 py-2 text-sm text-slate-700 align-top";

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className={th}>Cliente</th>
            <th className={th}>Influencer</th>
            <th className={th}>Red</th>
            <th className={th}>Post</th>
            <th className={`${th} text-right`}>Vistas</th>
            <th className={`${th} text-right`}>Reacciones</th>
            <th className={`${th} text-right`}>Subs/Miembros</th>
            <th className={th}>Actualizado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((e) => (
            <tr key={e.id} className="hover:bg-slate-50">
              <td className={td}>{e.cliente || "—"}</td>
              <td className={td}>
                <div className="font-medium text-slate-800">{e.influencer}</div>
                {e.usuario && (
                  <div className="text-xs text-slate-400">{e.usuario}</div>
                )}
              </td>
              <td className={td}>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    e.redSocial === "Telegram"
                      ? "bg-sky-100 text-sky-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {e.redSocial}
                </span>
              </td>
              <td className={td}>
                <a
                  href={e.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand hover:underline"
                >
                  {e.tipo || "Ver"} ↗
                </a>
              </td>
              <td className={`${td} text-right tabular-nums font-medium`}>
                {e.redSocial === "WhatsApp" ? "—" : fmt(e.vistas)}
              </td>
              <td className={`${td} text-right tabular-nums`}>
                {e.redSocial === "WhatsApp" ? "—" : fmt(e.reacciones)}
              </td>
              <td className={`${td} text-right tabular-nums`}>
                {e.redSocial === "WhatsApp" ? "—" : fmt(e.suscriptores)}
              </td>
              <td className={`${td} text-xs text-slate-400`}>
                {fmtFecha(e.ultimaActualizacion)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
