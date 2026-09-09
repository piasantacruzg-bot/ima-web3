import type { SocialPlatform } from "@/types/database";
import type { SocialPlatformAdapter } from "@/lib/integrations/social-platform-adapter";
import { InstagramAdapter } from "@/lib/integrations/instagram/adapter";
import { TikTokAdapter } from "@/lib/integrations/tiktok/adapter";
import { XAdapter } from "@/lib/integrations/x/adapter";
import { YouTubeAdapter } from "@/lib/integrations/youtube/adapter";
import { FacebookAdapter, OtherPlatformAdapter } from "@/lib/integrations/facebook-other-adapter";

// One adapter instance per (platform, social account) — every real
// adapter here reports itself unconfigured until real OAuth credentials
// exist (see each provider's isConfigured()); none of them ever return
// fabricated data. Tests use lib/integrations/mock/adapter.ts directly
// instead of going through this registry, so a mock provider can never
// leak into production UI.
export function getSocialPlatformAdapter(platform: SocialPlatform, socialAccountId: string): SocialPlatformAdapter {
  switch (platform) {
    case "instagram":
      return new InstagramAdapter(socialAccountId);
    case "tiktok":
      return new TikTokAdapter(socialAccountId);
    case "x":
      return new XAdapter(socialAccountId);
    case "youtube":
      return new YouTubeAdapter(socialAccountId);
    case "facebook":
      return new FacebookAdapter(socialAccountId);
    case "other":
      return new OtherPlatformAdapter(socialAccountId);
  }
}
