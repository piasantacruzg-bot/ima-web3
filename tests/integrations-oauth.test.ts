import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isInstagramConfigured, buildInstagramAuthorizeUrl } from "@/lib/integrations/instagram/oauth";
import { isTikTokConfigured, buildTikTokAuthorizeUrl } from "@/lib/integrations/tiktok/oauth";
import { isXConfigured, buildXAuthorizeUrl, generatePkcePair } from "@/lib/integrations/x/oauth";
import { isYouTubeConfigured, buildYouTubeAuthorizeUrl } from "@/lib/integrations/youtube/oauth";
import { InstagramAdapter } from "@/lib/integrations/instagram/adapter";
import { TikTokAdapter } from "@/lib/integrations/tiktok/adapter";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("Instagram OAuth", () => {
  it("reports not configured when META_APP_ID/META_APP_SECRET are unset", () => {
    delete process.env.META_APP_ID;
    delete process.env.META_APP_SECRET;
    expect(isInstagramConfigured()).toBe(false);
    expect(buildInstagramAuthorizeUrl("state")).toBeNull();
  });

  it("builds a real Facebook Graph authorize URL once configured", () => {
    process.env.META_APP_ID = "app123";
    process.env.META_APP_SECRET = "secret";
    process.env.META_REDIRECT_URI = "https://app.example.com/api/integrations/instagram/callback";
    expect(isInstagramConfigured()).toBe(true);
    const url = buildInstagramAuthorizeUrl("state-abc");
    expect(url).toContain("https://www.facebook.com/v19.0/dialog/oauth");
    expect(url).toContain("client_id=app123");
    expect(url).toContain("state=state-abc");
    expect(url).toContain(encodeURIComponent("https://app.example.com/api/integrations/instagram/callback"));
  });

  it("returns null when redirect URI is missing even with credentials set", () => {
    process.env.META_APP_ID = "app123";
    process.env.META_APP_SECRET = "secret";
    delete process.env.META_REDIRECT_URI;
    expect(buildInstagramAuthorizeUrl("state")).toBeNull();
  });
});

describe("TikTok OAuth", () => {
  it("uses client_key, not client_id, per TikTok's actual API", () => {
    process.env.TIKTOK_CLIENT_KEY = "key123";
    process.env.TIKTOK_CLIENT_SECRET = "secret";
    process.env.TIKTOK_REDIRECT_URI = "https://app.example.com/callback";
    const url = buildTikTokAuthorizeUrl("state");
    expect(url).toContain("client_key=key123");
    expect(url).not.toContain("client_id=");
  });

  it("reports not configured when credentials are missing", () => {
    delete process.env.TIKTOK_CLIENT_KEY;
    delete process.env.TIKTOK_CLIENT_SECRET;
    expect(isTikTokConfigured()).toBe(false);
  });
});

describe("X OAuth (PKCE)", () => {
  it("generates a distinct code_verifier/code_challenge pair each call", () => {
    const a = generatePkcePair();
    const b = generatePkcePair();
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
    expect(a.codeChallenge).not.toBe(b.codeChallenge);
  });

  it("includes the PKCE challenge and S256 method in the authorize URL", () => {
    process.env.X_CLIENT_ID = "client";
    process.env.X_CLIENT_SECRET = "secret";
    process.env.X_REDIRECT_URI = "https://app.example.com/callback";
    const { codeChallenge } = generatePkcePair();
    const url = buildXAuthorizeUrl("state", codeChallenge);
    expect(url).toContain("code_challenge_method=S256");
    expect(url).toContain(`code_challenge=${codeChallenge}`);
  });

  it("reports not configured without credentials", () => {
    delete process.env.X_CLIENT_ID;
    expect(isXConfigured()).toBe(false);
  });
});

describe("YouTube OAuth", () => {
  it("requests offline access and consent for refresh tokens", () => {
    process.env.YOUTUBE_CLIENT_ID = "client";
    process.env.YOUTUBE_CLIENT_SECRET = "secret";
    process.env.YOUTUBE_REDIRECT_URI = "https://app.example.com/callback";
    const url = buildYouTubeAuthorizeUrl("state");
    expect(url).toContain("access_type=offline");
    expect(url).toContain("prompt=consent");
  });

  it("reports not configured without credentials", () => {
    delete process.env.YOUTUBE_CLIENT_ID;
    expect(isYouTubeConfigured()).toBe(false);
  });
});

describe("Adapter connect() reflects configuration state", () => {
  beforeEach(() => {
    delete process.env.META_APP_ID;
    delete process.env.META_APP_SECRET;
    delete process.env.TIKTOK_CLIENT_KEY;
    delete process.env.TIKTOK_CLIENT_SECRET;
  });

  it("Instagram adapter fails to connect without credentials, never fabricating an OAuth URL", async () => {
    const adapter = new InstagramAdapter("account-1");
    expect(adapter.isConfigured()).toBe(false);
    const result = await adapter.connect();
    expect(result.ok).toBe(false);
  });

  it("TikTok adapter succeeds once credentials + redirect URI are set", async () => {
    process.env.TIKTOK_CLIENT_KEY = "key";
    process.env.TIKTOK_CLIENT_SECRET = "secret";
    process.env.TIKTOK_REDIRECT_URI = "https://app.example.com/callback";
    const adapter = new TikTokAdapter("account-2");
    const result = await adapter.connect();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.oauthUrl).toContain("tiktok.com");
  });

  it("every adapter method other than connect stays unavailable — no fabricated account/post/metric data", async () => {
    const adapter = new InstagramAdapter("account-3");
    expect((await adapter.getAccount()).ok).toBe(false);
    expect((await adapter.getPosts()).ok).toBe(false);
    expect((await adapter.getPostMetrics("post-1")).ok).toBe(false);
  });
});
