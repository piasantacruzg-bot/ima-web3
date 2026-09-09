import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (static files)
     * - favicon.ico
     * - public assets
     * - api/cron/* — machine-to-machine scheduled jobs with no browser
     *   session; they carry no cookies to refresh, and /api/cron/sync
     *   enforces its own CRON_SECRET bearer-token check. Without this
     *   exclusion, this session-based middleware would redirect every
     *   unauthenticated cron request to /login before it ever reached
     *   that check.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
