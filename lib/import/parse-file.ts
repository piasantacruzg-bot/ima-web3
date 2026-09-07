// Client-side CSV/XLS/XLSX parsing for the import wizard's "Upload" and
// "Select Sheets" steps (spec: multi-sheet support). Runs entirely in the
// browser before anything is sent to the server, so the user can review
// what was read before it touches the database.
//
// Security (spec: "no macro/formula execution", "file validation",
// "sanitization"): extension + size are checked before parsing; XLSX
// workbooks are read with macros and formula evaluation disabled, and every
// cell is read as its already-computed display string (`raw: false`) —
// never a formula string this app or a later export could re-evaluate.

import Papa from "papaparse";
import * as XLSX from "xlsx";

export const MAX_IMPORT_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
export const MAX_ROWS_PER_SHEET = 50_000;

const ALLOWED_EXTENSIONS = [".csv", ".xls", ".xlsx"];

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  // True when the sheet had more data rows than MAX_ROWS_PER_SHEET and the
  // excess was dropped from this preview — surfaced so the wizard can warn
  // the user rather than silently importing a partial file.
  truncated: boolean;
}

export interface ParsedImportFile {
  fileName: string;
  fileType: "csv" | "xlsx";
  sheets: ParsedSheet[];
}

export class ImportFileError extends Error {}

function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

// Column headers must be unique so the "Map Columns" step can address each
// one unambiguously. A blank header becomes "Column N"; a repeated header
// gets a " (2)", " (3)"... suffix rather than silently merging two columns
// of source data into one.
function dedupeHeaders(raw: (string | undefined)[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((value, i) => {
    const base = (value ?? "").toString().trim() || `Column ${i + 1}`;
    const key = base.toLowerCase();
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

function toRows(headers: string[], dataRows: string[][]): { rows: Record<string, string>[]; truncated: boolean } {
  const truncated = dataRows.length > MAX_ROWS_PER_SHEET;
  const limited = truncated ? dataRows.slice(0, MAX_ROWS_PER_SHEET) : dataRows;
  const rows = limited.map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = (cells[i] ?? "").toString();
    });
    return row;
  });
  return { rows, truncated };
}

export function validateImportFile(file: File): void {
  const extension = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new ImportFileError(
      `Unsupported file type "${extension || "unknown"}". Upload a .csv, .xls, or .xlsx file.`
    );
  }
  if (file.size === 0) {
    throw new ImportFileError("The file is empty.");
  }
  if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
    const maxMb = MAX_IMPORT_FILE_SIZE_BYTES / 1024 / 1024;
    throw new ImportFileError(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is ${maxMb}MB.`
    );
  }
}

function parseCsv(text: string): ParsedSheet {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  if (result.data.length === 0) {
    throw new ImportFileError(
      result.errors[0]?.message ? `Could not parse CSV: ${result.errors[0].message}` : "The CSV file is empty."
    );
  }

  const [headerRow, ...dataRows] = result.data;
  if (!headerRow || headerRow.length === 0) {
    throw new ImportFileError("The CSV file has no header row.");
  }
  const headers = dedupeHeaders(headerRow);
  const { rows, truncated } = toRows(headers, dataRows);

  return { name: "Sheet1", headers, rows, rowCount: rows.length, truncated };
}

function parseWorkbookSheet(workbook: XLSX.WorkBook, sheetName: string): ParsedSheet {
  const worksheet = workbook.Sheets[sheetName];
  const table = XLSX.utils.sheet_to_json<string[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });

  const [headerRow, ...dataRows] = table;
  if (!headerRow || headerRow.length === 0) {
    return { name: sheetName, headers: [], rows: [], rowCount: 0, truncated: false };
  }
  const headers = dedupeHeaders(headerRow);
  const { rows, truncated } = toRows(headers, dataRows);

  return { name: sheetName, headers, rows, rowCount: rows.length, truncated };
}

export async function parseImportFile(file: File): Promise<ParsedImportFile> {
  validateImportFile(file);
  const extension = getExtension(file.name);

  if (extension === ".csv") {
    const text = await file.text();
    return { fileName: file.name, fileType: "csv", sheets: [parseCsv(text)] };
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    bookVBA: false,
    cellFormula: false,
    cellHTML: false,
  });

  const sheets = workbook.SheetNames.map((name) => parseWorkbookSheet(workbook, name)).filter(
    (sheet) => sheet.headers.length > 0
  );

  if (sheets.length === 0) {
    throw new ImportFileError("No sheets with data were found in this file.");
  }

  return { fileName: file.name, fileType: "xlsx", sheets };
}
