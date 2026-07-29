import { google, type drive_v3 } from "googleapis";
import { Readable } from "node:stream";

// ============================================================
// Google Drive persistence.
//
// Folder layout created inside GOOGLE_DRIVE_FOLDER_ID:
//
//   Finance Tracker/
//     2026/
//       01 - January/
//         Finance_January_2026.xlsx
//         Receipts/
//         Reports/
//       ...
//     Dashboard/
//       Annual Summary.xlsx
//       Net Worth History.xlsx
//
// Auth uses an OAuth2 refresh token (per-user). If the required
// env vars are missing the module reports "not configured" and the
// app falls back to local-only storage — nothing breaks.
// ============================================================

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID ?? "11iXBsH_9SpoaqqS5nBPDKVxkEVse4mb4";
const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.GOOGLE_OAUTH_REDIRECT ?? "http://localhost:3000/api/auth/google/callback";
const REFRESH_TOKEN = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export function isDriveConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

/** True when we also have a refresh token and can actually read/write. */
export function isDriveConnected(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);
}

export function oauthClient() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Google OAuth is not configured.");
  }
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getAuthUrl(): string {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

export async function exchangeCode(code: string) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  return tokens; // caller persists tokens.refresh_token
}

function driveClient(): drive_v3.Drive {
  const client = oauthClient();
  client.setCredentials({ refresh_token: REFRESH_TOKEN });
  return google.drive({ version: "v3", auth: client });
}

// --- Folder / file helpers ----------------------------------------

async function findChild(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
  folder: boolean
): Promise<string | null> {
  const q = [
    `'${parentId}' in parents`,
    `name = '${name.replace(/'/g, "\\'")}'`,
    folder ? `mimeType = '${FOLDER_MIME}'` : `mimeType != '${FOLDER_MIME}'`,
    "trashed = false",
  ].join(" and ");
  const res = await drive.files.list({ q, fields: "files(id,name)", pageSize: 1 });
  return res.data.files?.[0]?.id ?? null;
}

async function ensureFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string
): Promise<string> {
  const existing = await findChild(drive, parentId, name, true);
  if (existing) return existing;
  const res = await drive.files.create({
    requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
    fields: "id",
  });
  return res.data.id!;
}

async function uploadOrUpdate(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
  data: Buffer
): Promise<string> {
  const existing = await findChild(drive, parentId, name, false);
  const media = { mimeType: XLSX_MIME, body: Readable.from(data) };
  if (existing) {
    await drive.files.update({ fileId: existing, media });
    return existing;
  }
  const res = await drive.files.create({
    requestBody: { name, parents: [parentId], mimeType: XLSX_MIME },
    media,
    fields: "id",
  });
  return res.data.id!;
}

// --- Public sync operations ---------------------------------------

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Ensure the folder path for a month exists; returns the month folder id. */
async function monthFolder(
  drive: drive_v3.Drive,
  year: number,
  monthIndex0: number
): Promise<string> {
  const root = await ensureFolder(drive, ROOT_FOLDER_ID, "Finance Tracker");
  const yearFolder = await ensureFolder(drive, root, String(year));
  const label = `${String(monthIndex0 + 1).padStart(2, "0")} - ${MONTH_NAMES[monthIndex0]}`;
  const monthDir = await ensureFolder(drive, yearFolder, label);
  // Sibling folders required by the spec.
  await ensureFolder(drive, monthDir, "Receipts");
  await ensureFolder(drive, monthDir, "Reports");
  return monthDir;
}

export async function syncMonthlyWorkbook(
  year: number,
  monthIndex0: number,
  workbook: Buffer
): Promise<{ fileId: string }> {
  const drive = driveClient();
  const dir = await monthFolder(drive, year, monthIndex0);
  const fileName = `Finance_${MONTH_NAMES[monthIndex0]}_${year}.xlsx`;
  const fileId = await uploadOrUpdate(drive, dir, fileName, workbook);
  return { fileId };
}

export async function syncDashboardWorkbook(
  name: "Annual Summary.xlsx" | "Net Worth History.xlsx",
  workbook: Buffer
): Promise<{ fileId: string }> {
  const drive = driveClient();
  const root = await ensureFolder(drive, ROOT_FOLDER_ID, "Finance Tracker");
  const dashboard = await ensureFolder(drive, root, "Dashboard");
  const fileId = await uploadOrUpdate(drive, dashboard, name, workbook);
  return { fileId };
}

/** Weekly backup: copies the current month workbook into a Backups folder. */
export async function createWeeklyBackup(
  year: number,
  monthIndex0: number,
  workbook: Buffer,
  stampISO: string
): Promise<{ fileId: string }> {
  const drive = driveClient();
  const root = await ensureFolder(drive, ROOT_FOLDER_ID, "Finance Tracker");
  const backups = await ensureFolder(drive, root, "Backups");
  const name = `Finance_${MONTH_NAMES[monthIndex0]}_${year}_backup_${stampISO.slice(0, 10)}.xlsx`;
  const fileId = await uploadOrUpdate(drive, backups, name, workbook);
  return { fileId };
}

export { ROOT_FOLDER_ID };
