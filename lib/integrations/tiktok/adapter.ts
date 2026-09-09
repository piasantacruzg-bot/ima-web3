import { randomUUID } from "node:crypto";
import { NotConfiguredAdapter, type AdapterResult } from "@/lib/integrations/social-platform-adapter";
import { isTikTokConfigured, buildTikTokAuthorizeUrl } from "@/lib/integrations/tiktok/oauth";
import type { SocialPlatform } from "@/types/database";

// TikTok's Display/Content API only exposes metrics for videos owned by
// the connected account — no third-party post lookup exists (spec
// section 8).
export class TikTokAdapter extends NotConfiguredAdapter {
  readonly platform: SocialPlatform = "tiktok";

  isConfigured(): boolean {
    return isTikTokConfigured();
  }

  async connect(): Promise<AdapterResult<{ oauthUrl: string }>> {
    const url = buildTikTokAuthorizeUrl(randomUUID());
    if (!url) {
      return {
        ok: false,
        error: "TikTok isn't configured (TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET/TIKTOK_REDIRECT_URI missing).",
      };
    }
    return { ok: true, data: { oauthUrl: url } };
  }
}
