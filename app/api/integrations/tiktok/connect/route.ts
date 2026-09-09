import { NextRequest, NextResponse } from "next/server";
import { TikTokAdapter } from "@/lib/integrations/tiktok/adapter";

// See app/api/integrations/instagram/connect/route.ts for the pattern
// and its callback-endpoint caveat.
export async function GET(request: NextRequest) {
  const socialAccountId = request.nextUrl.searchParams.get("accountId") ?? "unassigned";
  const adapter = new TikTokAdapter(socialAccountId);
  const result = await adapter.connect();

  if (!result.ok) {
    return NextResponse.redirect(new URL(`/settings/integrations?error=${encodeURIComponent(result.error)}`, request.url));
  }
  return NextResponse.redirect(result.data.oauthUrl);
}
