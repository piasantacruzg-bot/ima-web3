// Architecture-only Google Drive integration boundary (Phase 5 spec section
// 15/41): content_evidence already has drive_file_id/drive_folder_id/
// drive_url columns so a real OAuth-backed integration can be dropped in
// later without a schema change. This module must never hardcode
// credentials and must never pretend a live Drive session exists — when
// the required env vars are absent (true today) every method reports
// itself unconfigured so callers fall back to direct upload or pasting a
// Drive share link into content_evidence.drive_url by hand.

export type AdapterResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface DriveFileMetadata {
  fileId: string;
  name: string;
  webViewLink: string;
  mimeType: string | null;
}

export interface GoogleDriveAdapter {
  isConfigured(): boolean;
  getAuthUrl(redirectUri: string): AdapterResult<{ url: string }>;
  createFolder(name: string, parentFolderId?: string): Promise<AdapterResult<{ folderId: string }>>;
  uploadFile(fileName: string, fileBytes: Uint8Array, folderId?: string): Promise<AdapterResult<DriveFileMetadata>>;
  getFileMetadata(fileId: string): Promise<AdapterResult<DriveFileMetadata>>;
}

const NOT_CONFIGURED_ERROR =
  "Google Drive is not connected. Upload the file directly or paste a Drive share link instead.";

// No API calls happen here at all — every method short-circuits to the
// "not configured" result. Reading credentials only from env vars (never
// literals) means this stays safe to ship even once real vars are added
// elsewhere: this class simply becomes dead code the day a real adapter
// (backed by google-auth-library / googleapis) is registered below.
class UnconfiguredGoogleDriveAdapter implements GoogleDriveAdapter {
  isConfigured(): boolean {
    return false;
  }

  getAuthUrl(): AdapterResult<{ url: string }> {
    return { ok: false, error: NOT_CONFIGURED_ERROR };
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

function hasDriveCredentials(): boolean {
  return Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
      process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN
  );
}

// Phase 6 hookup point: once GOOGLE_DRIVE_CLIENT_ID/SECRET/REFRESH_TOKEN
// are set in the environment, replace this branch with a real adapter
// built on the googleapis SDK. Until then it always returns the
// unconfigured adapter, regardless of partial/malformed env vars.
export function getGoogleDriveAdapter(): GoogleDriveAdapter {
  if (!hasDriveCredentials()) {
    return new UnconfiguredGoogleDriveAdapter();
  }
  return new UnconfiguredGoogleDriveAdapter();
}
