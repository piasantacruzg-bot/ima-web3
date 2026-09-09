import { randomBytes, createHash } from "node:crypto";

// X (Twitter) OAuth 2.0 with PKCE — required by X's API even for a
// confidential client. The code_verifier must be persisted (e.g. in a
// short-lived signed cookie) between the redirect and the callback; this
// module only builds the authorize URL and generates the PKCE pair.
const AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";
const SCOPES = ["tweet.read", "users.read", "offline.access"];

export function isXConfigured(): boolean {
  return Boolean(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET);
}

function base64Url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = base64Url(randomBytes(32));
  const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

export function buildXAuthorizeUrl(state: string, codeChallenge: string): string | null {
  if (!isXConfigured()) return null;
  const redirectUri = process.env.X_REDIRECT_URI;
  if (!redirectUri) return null;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.X_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}
