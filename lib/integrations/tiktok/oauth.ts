// TikTok for Developers OAuth. Note the param is `client_key`, not
// `client_id` — matches TikTok's actual API and the project's existing
// TIKTOK_CLIENT_KEY env var name (see .env.example).
const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const SCOPES = ["user.info.basic", "video.list"];

export function isTikTokConfigured(): boolean {
  return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
}

export function buildTikTokAuthorizeUrl(state: string): string | null {
  if (!isTikTokConfigured()) return null;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;
  if (!redirectUri) return null;

  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    scope: SCOPES.join(","),
    response_type: "code",
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}
