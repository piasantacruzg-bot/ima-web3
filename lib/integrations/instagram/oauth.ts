// Real Instagram professional-account OAuth goes through Facebook Login
// for Business (Graph API) — env var names match the ones already
// established in .env.example (META_APP_ID / META_APP_SECRET /
// META_REDIRECT_URI), not the generic INSTAGRAM_* names, per the
// project's existing convention.
const AUTHORIZE_URL = "https://www.facebook.com/v19.0/dialog/oauth";
const SCOPES = ["instagram_basic", "instagram_manage_insights", "pages_show_list"];

export function isInstagramConfigured(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export function buildInstagramAuthorizeUrl(state: string): string | null {
  if (!isInstagramConfigured()) return null;
  const redirectUri = process.env.META_REDIRECT_URI;
  if (!redirectUri) return null;

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: redirectUri,
    scope: SCOPES.join(","),
    response_type: "code",
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}
