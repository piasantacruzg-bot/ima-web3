import { NextRequest, NextResponse } from "next/server";
import { InstagramAdapter } from "@/lib/integrations/instagram/adapter";

// Redirect-only: builds the real Instagram (Meta Graph) OAuth authorize
// URL when META_APP_ID/META_APP_SECRET/META_REDIRECT_URI are configured
// and sends the browser there. The callback/token-exchange endpoint is
// intentionally not implemented — it can't be exercised without a real
// registered Meta app, and this route never pretends a session was
// established.
export async function GET(request: NextRequest) {
  const socialAccountId = request.nextUrl.searchParams.get("accountId") ?? "unassigned";
  const adapter = new InstagramAdapter(socialAccountId);
  const result = await adapter.connect();

  if (!result.ok) {
    return NextResponse.redirect(new URL(`/settings/integrations?error=${encodeURIComponent(result.error)}`, request.url));
  }
  return NextResponse.redirect(result.data.oauthUrl);
}
