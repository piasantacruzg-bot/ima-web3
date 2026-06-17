import { google } from "googleapis";
import {
  Entry,
  SHEET_HEADERS,
  entryToRow,
  rowToEntry,
} from "./types";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_TAB = process.env.GOOGLE_SHEET_TAB || "Sheet1";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Faltan credenciales de Google. Configura GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_PRIVATE_KEY."
    );
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient() {
  if (!SHEET_ID) {
    throw new Error("Falta GOOGLE_SHEET_ID (el ID de la master sheet).");
  }
  return google.sheets({ version: "v4", auth: getAuth() });
}

/** Asegura que la primera fila tenga los encabezados correctos. */
export async function ensureHeaders(): Promise<void> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A1:M1`,
  });
  const current = res.data.values?.[0] ?? [];
  if (current.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [SHEET_HEADERS as unknown as string[]] },
    });
  }
}

/** Lee todas las entradas de la master sheet (saltando el encabezado). */
export async function getEntries(): Promise<Entry[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A2:M`,
  });
  const rows = (res.data.values ?? []) as string[][];
  return rows
    .filter((r) => r.length > 0 && (r[0] ?? "").trim() !== "")
    .map(rowToEntry);
}

/** Agrega una nueva entrada al final de la master sheet. */
export async function appendEntry(entry: Entry): Promise<void> {
  await ensureHeaders();
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A:M`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [entryToRow(entry)] },
  });
}

/**
 * Reescribe TODAS las filas de datos. Se usa al refrescar metricas para
 * mantener la master sheet sincronizada con los nuevos numeros.
 */
export async function replaceAllEntries(entries: Entry[]): Promise<void> {
  await ensureHeaders();
  const sheets = getSheetsClient();

  // Limpiamos el rango de datos previo y escribimos el set completo.
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A2:M`,
  });

  if (entries.length === 0) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A2`,
    valueInputOption: "RAW",
    requestBody: { values: entries.map(entryToRow) },
  });
}
