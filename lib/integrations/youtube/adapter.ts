import { randomUUID } from "node:crypto";
import { NotConfiguredAdapter, type AdapterResult } from "@/lib/integrations/social-platform-adapter";
import { isYouTubeConfigured, buildYouTubeAuthorizeUrl } from "@/lib/integrations/youtube/oauth";
import type { SocialPlatform } from "@/types/database";

// Public video statistics (views/likes/comments) are available without
// the channel owner's consent via the Data API; watch time / audience
// retention require the channel owner to authorize (spec section 10).
export class YouTubeAdapter extends NotConfiguredAdapter {
  readonly platform: SocialPlatform = "youtube";

  isConfigured(): boolean {
    return isYouTubeConfigured();
  }

  async connect(): Promise<AdapterResult<{ oauthUrl: string }>> {
    const url = buildYouTubeAuthorizeUrl(randomUUID());
    if (!url) {
      return {
        ok: false,
        error: "YouTube isn't configured (YOUTUBE_CLIENT_ID/YOUTUBE_CLIENT_SECRET/YOUTUBE_REDIRECT_URI missing).",
      };
    }
    return { ok: true, data: { oauthUrl: url } };
  }
}
