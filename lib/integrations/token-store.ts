// Server-only token encryption for the integration_tokens table (spec
// section 5: "never store... access tokens in plain client-side storage").
// AES-256-GCM with a key from INTEGRATION_TOKEN_ENCRYPTION_KEY (a 32-byte
// key, base64-encoded) — never imported by anything that ships to the
// browser, and never logged (see lib/audit.ts calls in the routes that
// use this: they log that a token was stored/refreshed, never its value).

import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export function isTokenEncryptionConfigured(): boolean {
  return Boolean(process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY);
}

function getKey(): Buffer {
  const raw = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "INTEGRATION_TOKEN_ENCRYPTION_KEY is not set — refusing to store a token unencrypted."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("INTEGRATION_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded).");
  }
  return key;
}

// Returns iv + authTag + ciphertext, all base64-joined with ":" — never
// the plaintext token, never a reversible-without-the-key encoding.
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptToken(encrypted: string): string {
  const key = getKey();
  const [ivB64, authTagB64, ciphertextB64] = encrypted.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Malformed encrypted token — expected iv:authTag:ciphertext.");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
