"use client";

import { useState } from "react";
import { REDES_SOCIALES, RedSocial } from "@/lib/types";

interface Props {
  onAdded: () => void;
}

const TIPOS = ["Post", "Video", "Story", "Mensaje", "Anuncio", "Otro"];

export default function EntryForm({ onAdded }: Props) {
  const [cliente, setCliente] = useState("");
  const [influencer, setInfluencer] = useState("");
  const [redSocial, setRedSocial] = useState<RedSocial>("Telegram");
  const [usuario, setUsuario] = useState("");
  const [link, setLink] = useState("");
  const [tipo, setTipo] = useState("Post");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esWhatsApp = redSocial === "WhatsApp";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente,
          influencer,
          redSocial,
          usuario,
          link,
          tipo,
          notas,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      setCliente("");
      setInfluencer("");
      setUsuario("");
      setLink("");
      setNotas("");
      onAdded();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
  const label = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="mb-4 text-base font-semibold text-slate-800">
        Agregar publicacion
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={label}>Cliente / Cuenta</label>
          <input
            className={input}
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Ej. Casino X, Token Y"
          />
        </div>

        <div>
          <label className={label}>Influencer *</label>
          <input
            className={input}
            value={influencer}
            onChange={(e) => setInfluencer(e.target.value)}
            placeholder="Nombre del influencer"
            required
          />
        </div>

        <div>
          <label className={label}>Red social</label>
          <select
            className={input}
            value={redSocial}
            onChange={(e) => setRedSocial(e.target.value as RedSocial)}
          >
            {REDES_SOCIALES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label}>Usuario / Canal</label>
          <input
            className={input}
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="@canal"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={label}>Link del post *</label>
          <input
            className={input}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder={
              esWhatsApp
                ? "https://chat.whatsapp.com/..."
                : "https://t.me/canal/123"
            }
            required
          />
        </div>

        <div>
          <label className={label}>Tipo de contenido</label>
          <select
            className={input}
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className={label}>Notas</label>
          <input
            className={input}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Comentarios opcionales"
          />
        </div>
      </div>

      {esWhatsApp && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          WhatsApp no expone metricas publicas. Esta fila se guardara, pero las
          vistas/reacciones deberas cargarlas manualmente en la master sheet.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Agregar y analizar"}
        </button>
      </div>
    </form>
  );
}
