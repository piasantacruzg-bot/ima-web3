export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

/** Cookie used to remember the visitor's language between visits. */
export const LOCALE_COOKIE = "briefandco-lang";

/** A value written once per language. */
export type Localized<T = string> = Record<Locale, T>;

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** Build an internal href for a locale, e.g. href("es", "/work") -> "/es/work". */
export function href(lang: Locale, path = "") {
  const clean = path === "/" ? "" : path;
  return `/${lang}${clean}`;
}

/** Swap the locale segment of a pathname, keeping the rest of the route. */
export function switchLocalePath(pathname: string, target: Locale) {
  const parts = pathname.split("/");
  if (isLocale(parts[1])) {
    parts[1] = target;
    return parts.join("/") || `/${target}`;
  }
  return `/${target}${pathname === "/" ? "" : pathname}`;
}
