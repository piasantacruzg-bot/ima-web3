// Google Drive integration boundary (Phase 5 architecture, filled in
// with a real OAuth authorize step in Phase 6). content_evidence already
// has drive_file_id/drive_folder_id/drive_url columns so a real
// OAuth-backed integration can be dropped in later without a schema
// change. This module must never hardcode credentials and must never
// pretend a live Drive session exists — when the required env vars are
// absent (true today) every method reports itself unconfigured so
// callers fall back to direct upload (Supabase Storage) or pasting a
// Drive share link into content_evidence.drive_url by hand.

import { randomUUID } from "node:crypto";

export type AdapterResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface DriveFileMetadata {
  fileId: string;
  name: string;
  webViewLink: string;
  mimeType: string | null;
}

export interface GoogleDriveAdapter {
  isConfigured(): boolean;
  getAuthUrl(): AdapterResult<{ url: string }>;
  createFolder(name: string, parentFolderId?: string): Promise<AdapterResult<{ folderId: string }>>;
  uploadFile(fileName: string, fileBytes: Uint8Array, folderId?: string): Promise<AdapterResult<DriveFileMetadata>>;
  getFileMetadata(fileId: string): Promise<AdapterResult<DriveFileMetadata>>;
}

const NOT_CONFIGURED_ERROR =
  "Google Drive is not connected. Upload the file directly or paste a Drive share link instead.";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

export function isGoogleDriveConfigured(): boolean {
  return Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET);
}

// No API calls happen here at all — every method short-circuits to the
// "not configured" result except getAuthUrl, which builds a real,
// correctly-formed Google OAuth URL once credentials exist (there's
// simply no token to call the Drive API with yet, since no callback
// route has completed a real exchange). Reading credentials only from
// env vars (never literals) means this stays safe to ship even once
// real vars are added elsewhere.
class UnconfiguredGoogleDriveAdapter implements GoogleDriveAdapter {
  isConfigured(): boolean {
    return isGoogleDriveConfigured();
  }

  getAuthUrl(): AdapterResult<{ url: string }> {
    if (!isGoogleDriveConfigured()) return { ok: false, error: NOT_CONFIGURED_ERROR };
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;
    if (!redirectUri) return { ok: false, error: NOT_CONFIGURED_ERROR };

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      state: randomUUID(),
    });
    return { ok: true, data: { url: `${AUTHORIZE_URL}?${params.toString()}` } };
  }

  async createFolder(): Promise<AdapterResult<{ folderId: string }>> {
    return { ok: false, error: NOT_CONFIGURED_ERROR };
  }

  async uploadFile(): Promise<AdapterResult<DriveFileMetadata>> {
    return { ok: false, error: NOT_CONFIGURED_ERROR };
  }

  async getFileMetadata(): Promise<AdapterResult<DriveFileMetadata>> {
    return { ok: false, error: NOT_CONFIGURED_ERROR };
  }
}

// Phase 7 hookup point: once a real callback route stores a refresh
// token (via lib/integrations/token-store.ts), replace this branch with
// a real adapter built on the googleapis SDK. Until then it always
// returns the unconfigured adapter.
export function getGoogleDriveAdapter(): GoogleDriveAdapter {
  return new UnconfiguredGoogleDriveAdapter();
}

// --- Folder structure (spec section 12) -----------------------------------
//
// Configurable, not hardcoded: Creator Campaign OS / {client} / {campaign}
// / {creator} / Stories. Callers can override any segment (e.g. a
// different root folder name) via `overrides`.
export interface DriveFolderPathInput {
  clientName: string;
  campaignName: string;
  creatorName: string;
  rootFolderName?: string;
  leafFolderName?: string;
}

export function buildDriveFolderPath(input: DriveFolderPathInput): string[] {
  return [
    input.rootFolderName ?? "Creator Campaign OS",
    input.clientName,
    input.campaignName,
    input.creatorName,
    input.leafFolderName ?? "Stories",
  ];
}
