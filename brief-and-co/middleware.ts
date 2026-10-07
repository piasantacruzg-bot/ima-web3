import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, defaultLocale, isLocale } from "@/lib/i18n";

// Every page lives under /en or /es. Requests without a locale are sent to
// the remembered language (cookie), then the browser language, then English.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (isLocale(first)) return NextResponse.next();

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const browser = request.headers
    .get("accept-language")
    ?.toLowerCase()
    .startsWith("es")
    ? "es"
    : undefined;
  const lang = isLocale(saved) ? saved : browser ?? defaultLocale;

  const url = request.nextUrl.clone();
  url.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|assets|favicon.ico|robots.txt|sitemap.xml).*)"],
};
