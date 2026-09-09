// YouTube Data API v3 via standard Google OAuth 2.0.
const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = ["https://www.googleapis.com/auth/youtube.readonly"];

export function isYouTubeConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET);
}

export function buildYouTubeAuthorizeUrl(state: string): string | null {
  if (!isYouTubeConfigured()) return null;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
  if (!redirectUri) return null;

  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}
