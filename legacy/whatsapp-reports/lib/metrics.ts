import { Entry, RedSocial } from "./types";

export interface MetricsResult {
  vistas: number;
  reacciones: number;
  suscriptores: number;
  /** true si las metricas se obtuvieron automaticamente */
  automatico: boolean;
  /** mensaje de error/aviso si algo no se pudo obtener */
  aviso?: string;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Convierte "12.3K" / "1.2M" / "1 234" a numero. */
export function parseCount(raw: string | undefined | null): number {
  if (!raw) return 0;
  const s = raw.trim().replace(/\s/g, "").replace(",", ".");
  const m = s.match(/^([\d.]+)\s*([KMB]?)/i);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return 0;
  const suf = m[2].toUpperCase();
  if (suf === "K") n *= 1_000;
  else if (suf === "M") n *= 1_000_000;
  else if (suf === "B") n *= 1_000_000_000;
  return Math.round(n);
}

/** Extrae {channel, messageId} de una URL de Telegram. */
export function parseTelegramLink(
  link: string
): { channel: string; messageId: string } | null {
  try {
    const url = new URL(link.trim());
    if (!/(^|\.)t\.me$/.test(url.hostname)) return null;
    // /s/canal/123  o  /canal/123  o  /canal
    const parts = url.pathname.split("/").filter(Boolean);
    const cleaned = parts[0] === "s" ? parts.slice(1) : parts;
    if (cleaned.length === 0) return null;
    return {
      channel: cleaned[0],
      messageId: cleaned[1] ?? "",
    };
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": BROWSER_UA, "Accept-Language": "en;q=0.9" },
    // Evita cache para tener siempre numeros frescos.
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} al pedir ${url}`);
  return res.text();
}

/**
 * Obtiene metricas de un post de un canal PUBLICO de Telegram leyendo la
 * vista embebida publica (no requiere API key ni login).
 */
export async function fetchTelegramMetrics(
  link: string
): Promise<MetricsResult> {
  const parsed = parseTelegramLink(link);
  if (!parsed) {
    return {
      vistas: 0,
      reacciones: 0,
      suscriptores: 0,
      automatico: false,
      aviso: "Link de Telegram no valido.",
    };
  }

  const { channel, messageId } = parsed;
  let vistas = 0;
  let reacciones = 0;
  let suscriptores = 0;
  let aviso: string | undefined;

  // --- Vistas y reacciones del post concreto ---
  if (messageId) {
    try {
      const html = await fetchText(
        `https://t.me/${channel}/${messageId}?embed=1&mode=tme`
      );

      const viewsMatch = html.match(
        /tgme_widget_message_views[^>]*>([^<]+)</i
      );
      if (viewsMatch) vistas = parseCount(viewsMatch[1]);

      // Sumamos todos los contadores de reacciones que aparezcan.
      const reactionMatches = html.matchAll(
        /tgme_widget_message_reaction[^>]*>[\s\S]*?<span[^>]*class="[^"]*emoji[^"]*"[\s\S]*?<\/span>\s*([\d.,KMB]+)/gi
      );
      for (const r of reactionMatches) reacciones += parseCount(r[1]);

      // Fallback de reacciones por clase de contador.
      if (reacciones === 0) {
        const counters = html.matchAll(
          /tgme_widget_message_reaction[^>]*>[^<]*<[^>]*>\s*([\d.,KMB]+)\s*</gi
        );
        for (const r of counters) reacciones += parseCount(r[1]);
      }

      if (!viewsMatch) {
        aviso =
          "No se pudieron leer las vistas (el canal podria ser privado o el post no existe).";
      }
    } catch (e) {
      aviso = `No se pudo leer el post: ${(e as Error).message}`;
    }
  }

  // --- Suscriptores del canal ---
  try {
    const html = await fetchText(`https://t.me/${channel}`);
    const subsMatch =
      html.match(/([\d.,\s]+[KMB]?)\s*subscribers/i) ||
      html.match(/tgme_page_extra[^>]*>([^<]*subscriber[^<]*)</i);
    if (subsMatch) suscriptores = parseCount(subsMatch[1]);
  } catch {
    // suscriptores opcional; no rompemos el flujo
  }

  return {
    vistas,
    reacciones,
    suscriptores,
    automatico: vistas > 0 || suscriptores > 0,
    aviso,
  };
}

/**
 * WhatsApp no expone metricas publicas (vistas/reacciones de mensajes de
 * comunidad). Conservamos lo que se haya cargado manualmente.
 */
export async function fetchWhatsAppMetrics(
  entry: Entry
): Promise<MetricsResult> {
  return {
    vistas: entry.vistas,
    reacciones: entry.reacciones,
    suscriptores: entry.suscriptores,
    automatico: false,
    aviso:
      "WhatsApp no expone metricas publicas. Estos numeros se cargan manualmente.",
  };
}

/** Despacha al fetcher correcto segun la red social. */
export async function fetchMetrics(entry: Entry): Promise<MetricsResult> {
  const red: RedSocial = entry.redSocial;
  if (red === "Telegram") return fetchTelegramMetrics(entry.link);
  if (red === "WhatsApp") return fetchWhatsAppMetrics(entry);
  return {
    vistas: entry.vistas,
    reacciones: entry.reacciones,
    suscriptores: entry.suscriptores,
    automatico: false,
    aviso: "Red social no soportada para metricas automaticas.",
  };
}
