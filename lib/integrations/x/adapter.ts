import { randomUUID } from "node:crypto";
import { NotConfiguredAdapter, type AdapterResult } from "@/lib/integrations/social-platform-adapter";
import { isXConfigured, buildXAuthorizeUrl, generatePkcePair } from "@/lib/integrations/x/oauth";
import type { SocialPlatform } from "@/types/database";

// X's free API tier doesn't include the metrics endpoints this app
// needs — connecting only becomes useful on a paid tier (spec section 9).
export class XAdapter extends NotConfiguredAdapter {
  readonly platform: SocialPlatform = "x";

  isConfigured(): boolean {
    return isXConfigured();
  }

  // PKCE means the caller must persist codeVerifier (e.g. in a signed,
  // short-lived cookie) to complete the callback — connect() alone can't
  // finish an OAuth 2.0 + PKCE flow without that round trip.
  async connect(): Promise<AdapterResult<{ oauthUrl: string }>> {
    const { codeChallenge } = generatePkcePair();
    const url = buildXAuthorizeUrl(randomUUID(), codeChallenge);
    if (!url) {
      return { ok: false, error: "X isn't configured (X_CLIENT_ID/X_CLIENT_SECRET/X_REDIRECT_URI missing)." };
    }
    return { ok: true, data: { oauthUrl: url } };
  }
}
