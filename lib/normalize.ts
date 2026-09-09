// Reusable normalization for creator data, shared by manual entry (Phase 2)
// and the CSV/XLSX importer (Phase 3) so both paths parse the same messy
// spreadsheet-style values the same way.

// "85K" -> 85000, "1.2M" -> 1200000, "2.5B" -> 2500000000, "2,500" -> 2500,
// "950" -> 950. Returns null (never NaN/0) when the input can't be parsed
// as a count — callers should treat null as "leave unset", not "zero".
export function parseFollowerCount(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input) : null;

  const trimmed = input.trim().replace(/,/g, "");
  if (!trimmed) return null;

  const match = trimmed.match(/^([\d.]+)\s*([kKmMbB]?)$/);
  if (!match) {
    const plain = Number(trimmed);
    return Number.isFinite(plain) ? Math.round(plain) : null;
  }

  const value = parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;

  const suffix = match[2].toLowerCase();
  const multiplier =
    suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : suffix === "b" ? 1_000_000_000 : 1;
  return Math.round(value * multiplier);
}

// "4.8%" -> 4.8, "4,8%" -> 4.8 (European decimal comma), "4.8" -> 4.8,
// "0.045" -> 4.5 (a bare fraction with no % sign is assumed to be a
// fraction-of-1 rather than already a percentage — real engagement
// fractions are always < 1, while a percentage figure typed as a plain
// number is always >= 1, e.g. "4.5" meaning 4.5%). Deliberately stores the
// result as a percentage value (4.8 meaning 4.8%), matching how the rest
// of the app displays and filters engagement_rate.
export function parseEngagementRate(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;

  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    return input > 0 && input < 1 ? input * 100 : input;
  }

  let trimmed = input.trim();
  if (!trimmed) return null;
  const hadPercentSign = trimmed.includes("%");
  trimmed = trimmed.replace(/%/g, "").trim();

  // European decimal comma: "4,5" -> "4.5". Only when there's a single
  // comma acting as a decimal point, not a thousands separator.
  if (/^\d+,\d+$/.test(trimmed)) {
    trimmed = trimmed.replace(",", ".");
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  if (!hadPercentSign && value > 0 && value < 1) return value * 100;
  return value;
}

// "@username" -> "username". Also strips a leading "@" that survives a
// pasted URL fragment.
export function stripHandle(input: string | null | undefined): string {
  return (input ?? "").trim().replace(/^@/, "");
}

// Collapses repeated whitespace and trims — the baseline for names,
// locations, and anything else that shouldn't be aggressively rewritten,
// just tidied.
export function normalizeWhitespace(input: string | null | undefined): string {
  return (input ?? "").trim().replace(/\s+/g, " ");
}

// "Fashion, fashion, Lifestyle" -> ["Fashion", "Lifestyle"]. Splits on
// comma/semicolon/pipe, trims, and de-duplicates case-insensitively while
// keeping the first-seen casing (never silently picks a "canonical" case
// the source didn't use).
export function normalizeCategoryList(input: string | null | undefined): string[] {
  if (!input) return [];
  const seen = new Map<string, string>();
  for (const raw of input.split(/[,;|]/)) {
    const value = normalizeWhitespace(raw);
    if (!value) continue;
    const key = value.toLowerCase();
    if (!seen.has(key)) seen.set(key, value);
  }
  return [...seen.values()];
}

// Trims, lowercases, and validates structure. Returns null for anything
// that isn't a plausible email — never guesses or repairs a broken
// address.
export function normalizeEmail(input: string | null | undefined): string | null {
  const value = normalizeWhitespace(input).toLowerCase();
  if (!value) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

// Strips spaces/parens/hyphens/dots down to a leading "+" (if present)
// plus digits. Never invents or assumes a country code that isn't already
// in the source value.
export function normalizePhone(input: string | null | undefined): string | null {
  const value = (input ?? "").trim();
  if (!value) return null;
  const hasPlus = value.startsWith("+");
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  return hasPlus ? `+${digits}` : digits;
}
