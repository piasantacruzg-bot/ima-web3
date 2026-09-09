import { randomUUID } from "node:crypto";
import { NotConfiguredAdapter, type AdapterResult } from "@/lib/integrations/social-platform-adapter";
import { isInstagramConfigured, buildInstagramAuthorizeUrl } from "@/lib/integrations/instagram/oauth";
import type { SocialPlatform } from "@/types/database";

// Real capabilities once connected, per Meta's Graph API for Instagram
// professional accounts: account info, media list, and Insights metrics
// for content published through the connected account. Metrics for
// content the account doesn't own are not obtainable via this API —
// there is no "look up any public post's metrics" endpoint (spec
// section 7's "Do NOT assume every Instagram creator can be connected").
export class InstagramAdapter extends NotConfiguredAdapter {
  readonly platform: SocialPlatform = "instagram";

  isConfigured(): boolean {
    return isInstagramConfigured();
  }

  async connect(): Promise<AdapterResult<{ oauthUrl: string }>> {
    const url = buildInstagramAuthorizeUrl(randomUUID());
    if (!url) {
      return {
        ok: false,
        error: "Instagram isn't configured (META_APP_ID/META_APP_SECRET/META_REDIRECT_URI missing).",
      };
    }
    return { ok: true, data: { oauthUrl: url } };
  }
}
