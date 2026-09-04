import { NextRequest, NextResponse } from "next/server";
import { appendEntry, getEntries } from "@/lib/sheets";
import { fetchMetrics } from "@/lib/metrics";
import { Entry, REDES_SOCIALES, RedSocial } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entries = await getEntries();
    return NextResponse.json({ entries });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const cliente = String(body.cliente ?? "").trim();
    const influencer = String(body.influencer ?? "").trim();
    const link = String(body.link ?? "").trim();
    const usuario = String(body.usuario ?? "").trim();
    const tipo = String(body.tipo ?? "Post").trim();
    const notas = String(body.notas ?? "").trim();
    const redSocial = (
      REDES_SOCIALES.includes(body.redSocial) ? body.redSocial : "Telegram"
    ) as RedSocial;

    if (!influencer || !link) {
      return NextResponse.json(
        { error: "Influencer y link son obligatorios." },
        { status: 400 }
      );
    }

    const entry: Entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fechaRegistro: new Date().toISOString().slice(0, 10),
      cliente,
      influencer,
      redSocial,
      usuario,
      link,
      tipo,
      vistas: Number(body.vistas) || 0,
      reacciones: Number(body.reacciones) || 0,
      suscriptores: Number(body.suscriptores) || 0,
      ultimaActualizacion: "",
      notas,
    };

    // Intentamos traer metricas de inmediato al registrar.
    try {
      const m = await fetchMetrics(entry);
      if (m.automatico) {
        entry.vistas = m.vistas;
        entry.reacciones = m.reacciones;
        entry.suscriptores = m.suscriptores;
        entry.ultimaActualizacion = new Date().toISOString();
      }
    } catch {
      // si falla el fetch, igual guardamos la fila
    }

    await appendEntry(entry);
    return NextResponse.json({ entry });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
