import { NextResponse } from "next/server";
import { exchangeCode, isDriveConfigured } from "@/lib/finance/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// OAuth redirect target. Exchanges the auth code for tokens and shows
// the refresh token so it can be stored as GOOGLE_OAUTH_REFRESH_TOKEN.
export async function GET(req: Request) {
  if (!isDriveConfigured()) {
    return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 501 });
  }
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error) {
    return html(`<h1>Authorization cancelled</h1><p>${escape(error)}</p>`);
  }
  if (!code) {
    return html("<h1>Missing authorization code.</h1>");
  }
  try {
    const tokens = await exchangeCode(code);
    const refresh = tokens.refresh_token;
    if (!refresh) {
      return html(
        `<h1>Connected, but no refresh token was returned.</h1>
         <p>Revoke access at <a href="https://myaccount.google.com/permissions">Google permissions</a> and try again to force consent.</p>`
      );
    }
    return html(
      `<h1>✅ Google Drive connected</h1>
       <p>Add this to your environment as <code>GOOGLE_OAUTH_REFRESH_TOKEN</code> and redeploy:</p>
       <pre style="white-space:pre-wrap;word-break:break-all;background:#f3f3f6;padding:16px;border-radius:12px">${escape(refresh)}</pre>
       <p>Your monthly workbooks will then sync into the configured Drive folder automatically.</p>
       <p><a href="/">← Back to Aura</a></p>`
    );
  } catch (err) {
    return html(`<h1>Token exchange failed</h1><p>${escape((err as Error).message)}</p>`);
  }
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

function html(body: string): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <title>Aura · Google Drive</title>
     <div style="max-width:640px;margin:48px auto;font-family:-apple-system,system-ui,sans-serif;padding:0 20px;line-height:1.5">${body}</div>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
