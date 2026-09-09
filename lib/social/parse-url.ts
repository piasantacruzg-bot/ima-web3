import type { SocialPlatform } from "@/types/database";

export interface ParsedSocialUrl {
  platform: SocialPlatform;
  username: string;
  profileUrl: string;
}

// Identifies platform + handle from a pasted profile URL (spec section 27 —
// "the system identifies platform, content type, post ID if possible").
// Deliberately conservative: returns null rather than guessing when a URL
// doesn't match a known pattern, so callers can fall back to manual entry.
export function parseSocialProfileUrl(input: string): ParsedSocialUrl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  const segments = url.pathname.split("/").filter(Boolean);

  const clean = (s: string | undefined) => (s ?? "").replace(/^@/, "");

  if (host.includes("instagram.com") && segments[0]) {
    return build("instagram", clean(segments[0]), `https://instagram.com/${clean(segments[0])}`);
  }
  if (host.includes("tiktok.com") && segments[0]) {
    return build("tiktok", clean(segments[0]), `https://tiktok.com/@${clean(segments[0])}`);
  }
  if ((host === "x.com" || host === "twitter.com") && segments[0]) {
    return build("x", clean(segments[0]), `https://x.com/${clean(segments[0])}`);
  }
  if (host.includes("youtube.com")) {
    const handleSegment = segments.find((s) => s.startsWith("@")) ?? segments[0];
    if (handleSegment) {
      return build(
        "youtube",
        clean(handleSegment),
        `https://youtube.com/${handleSegment.startsWith("@") ? handleSegment : `@${clean(handleSegment)}`}`
      );
    }
  }
  if (host.includes("facebook.com") && segments[0]) {
    return build("facebook", clean(segments[0]), `https://facebook.com/${clean(segments[0])}`);
  }

  return null;
}

function build(platform: SocialPlatform, username: string, profileUrl: string): ParsedSocialUrl | null {
  if (!username) return null;
  return { platform, username, profileUrl };
}
