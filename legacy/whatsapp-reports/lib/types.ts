export type RedSocial = "Telegram" | "WhatsApp";

export const REDES_SOCIALES: RedSocial[] = ["Telegram", "WhatsApp"];

export interface Entry {
  /** Identificador unico de la fila */
  id: string;
  /** Fecha en que se registro el link (YYYY-MM-DD) */
  fechaRegistro: string;
  /** Cuenta / marca para la que se hizo el post */
  cliente: string;
  /** Nombre del influencer */
  influencer: string;
  /** Red social donde se publico */
  redSocial: RedSocial;
  /** @usuario o nombre del canal */
  usuario: string;
  /** Link del post publicado */
  link: string;
  /** Tipo de contenido: Post, Video, Story, etc. */
  tipo: string;
  /** Vistas del post */
  vistas: number;
  /** Reacciones / interacciones del post */
  reacciones: number;
  /** Suscriptores del canal o miembros de la comunidad */
  suscriptores: number;
  /** Marca de tiempo de la ultima vez que se actualizaron las metricas (ISO) */
  ultimaActualizacion: string;
  /** Notas libres */
  notas: string;
}

/** Orden de columnas tal cual estan en la master sheet. */
export const SHEET_HEADERS = [
  "ID",
  "Fecha registro",
  "Cliente",
  "Influencer",
  "Red social",
  "Usuario/Canal",
  "Link del post",
  "Tipo de contenido",
  "Vistas",
  "Reacciones",
  "Suscriptores/Miembros",
  "Ultima actualizacion",
  "Notas",
] as const;

export function entryToRow(e: Entry): (string | number)[] {
  return [
    e.id,
    e.fechaRegistro,
    e.cliente,
    e.influencer,
    e.redSocial,
    e.usuario,
    e.link,
    e.tipo,
    e.vistas,
    e.reacciones,
    e.suscriptores,
    e.ultimaActualizacion,
    e.notas,
  ];
}

export function rowToEntry(row: string[]): Entry {
  const num = (v: string | undefined) => {
    const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  return {
    id: row[0] ?? "",
    fechaRegistro: row[1] ?? "",
    cliente: row[2] ?? "",
    influencer: row[3] ?? "",
    redSocial: (row[4] as RedSocial) ?? "Telegram",
    usuario: row[5] ?? "",
    link: row[6] ?? "",
    tipo: row[7] ?? "",
    vistas: num(row[8]),
    reacciones: num(row[9]),
    suscriptores: num(row[10]),
    ultimaActualizacion: row[11] ?? "",
    notas: row[12] ?? "",
  };
}
