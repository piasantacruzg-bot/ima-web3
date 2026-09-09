import { NextRequest, NextResponse } from "next/server";
import { getGoogleDriveAdapter } from "@/lib/integrations/google-drive/adapter";

// See app/api/integrations/instagram/connect/route.ts for the pattern
// and its callback-endpoint caveat.
export async function GET(request: NextRequest) {
  const adapter = getGoogleDriveAdapter();
  const result = adapter.getAuthUrl();

  if (!result.ok) {
    return NextResponse.redirect(new URL(`/settings/integrations/google-drive?error=${encodeURIComponent(result.error)}`, request.url));
  }
  return NextResponse.redirect(result.data.url);
}
