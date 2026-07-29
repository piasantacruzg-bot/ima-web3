import { NextResponse } from "next/server";
import { getAuthUrl, isDriveConfigured } from "@/lib/finance/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kick off the Google OAuth consent flow.
export async function GET() {
  if (!isDriveConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in your environment.",
      },
      { status: 501 }
    );
  }
  return NextResponse.redirect(getAuthUrl());
}
