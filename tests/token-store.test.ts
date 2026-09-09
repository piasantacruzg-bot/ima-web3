import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomBytes } from "node:crypto";
import { encryptToken, decryptToken, isTokenEncryptionConfigured } from "@/lib/integrations/token-store";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("token-store", () => {
  beforeEach(() => {
    process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  it("round-trips a token through encrypt/decrypt", () => {
    const plaintext = "ya29.a0AfH6SMBx-real-looking-access-token";
    const encrypted = encryptToken(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptToken(encrypted)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV) even for the same plaintext", () => {
    const a = encryptToken("same-token");
    const b = encryptToken("same-token");
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe("same-token");
    expect(decryptToken(b)).toBe("same-token");
  });

  it("refuses to decrypt a tampered ciphertext (GCM auth tag catches it)", () => {
    const encrypted = encryptToken("secret-token");
    const [iv, authTag, ciphertext] = encrypted.split(":");
    const tampered = [iv, authTag, ciphertext.slice(0, -2) + "AA"].join(":");
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("refuses to encrypt when no encryption key is configured", () => {
    delete process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY;
    expect(isTokenEncryptionConfigured()).toBe(false);
    expect(() => encryptToken("token")).toThrow();
  });

  it("rejects a key that isn't exactly 32 bytes", () => {
    process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
    expect(() => encryptToken("token")).toThrow();
  });
});
