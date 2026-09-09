import { NextRequest, NextResponse } from "next/server";
import { XAdapter } from "@/lib/integrations/x/adapter";

// See app/api/integrations/instagram/connect/route.ts for the pattern
// and its callback-endpoint caveat. X additionally requires PKCE, whose
// code_verifier a real callback route would need to have persisted —
// another reason the callback step isn't built without a live app to
// test it against.
export async function GET(request: NextRequest) {
  const socialAccountId = request.nextUrl.searchParams.get("accountId") ?? "unassigned";
  const adapter = new XAdapter(socialAccountId);
  const result = await adapter.connect();

  if (!result.ok) {
    return NextResponse.redirect(new URL(`/settings/integrations?error=${encodeURIComponent(result.error)}`, request.url));
  }
  return NextResponse.redirect(result.data.oauthUrl);
}
