import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

// Server client for Server Components / Route Handlers / Server Actions.
// Still uses the anon key + the caller's session — RLS still applies. Use
// createServiceRoleClient() only for privileged server-only work (e.g.
// resolving OAuth token references) that must bypass RLS.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component that can't set cookies —
            // safe to ignore as long as middleware.ts refreshes sessions.
          }
        },
      },
    }
  );
}

// Service-role client: bypasses RLS entirely. Server-only (route
// handlers / server actions), never imported into client bundles — the key
// is not prefixed with NEXT_PUBLIC_ so Next.js will not expose it.
export function createServiceRoleClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // service role client never reads/writes the user's session
        },
      },
    }
  );
}
