import { Instagram, Music2, Youtube, Twitter, Facebook, Link2 } from "lucide-react";
import type { SocialPlatform } from "@/types/database";

// Shared platform -> icon mapping, extracted from social-account-card.tsx
// (Phase 2) so campaign creator cards (Phase 4) reuse the same icons
// instead of redefining them.
export const PLATFORM_ICON = {
  instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
  x: Twitter,
  facebook: Facebook,
  other: Link2,
} as const satisfies Record<SocialPlatform, unknown>;

export function PlatformIcon({ platform, size = 14 }: { platform: SocialPlatform; size?: number }) {
  const Icon = PLATFORM_ICON[platform];
  return <Icon size={size} strokeWidth={1.75} />;
}
