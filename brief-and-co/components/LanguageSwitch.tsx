"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALE_COOKIE, locales, switchLocalePath, type Locale } from "@/lib/i18n";

export default function LanguageSwitch({ lang, label }: { lang: Locale; label: string }) {
  const pathname = usePathname() || `/${lang}`;

  function remember(target: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <nav className="lang-switch" aria-label={label}>
      {locales.map((l, i) => (
        <span key={l} style={{ display: "contents" }}>
          {i > 0 && (
            <span className="lang-switch__sep" aria-hidden="true">
              /
            </span>
          )}
          <Link
            href={switchLocalePath(pathname, l)}
            hrefLang={l}
            lang={l}
            aria-current={l === lang ? "true" : undefined}
            onClick={() => remember(l)}
          >
            {l.toUpperCase()}
            <span className="sr-only">{l === "en" ? " — English" : " — Español"}</span>
          </Link>
        </span>
      ))}
    </nav>
  );
}
