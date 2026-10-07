import type { Metadata } from "next";
import { site } from "@/content/site";
import { locales, type Locale } from "@/lib/i18n";

/** Page metadata with alternates for both languages. */
export function pageMetadata(lang: Locale, path: string, title: string, description: string): Metadata {
  const clean = path === "/" ? "" : path;
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}${clean}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}${clean}`])),
    },
    openGraph: {
      title,
      description,
      siteName: site.name,
      locale: lang === "es" ? "es_PE" : "en_US",
      type: "website",
    },
  };
}
