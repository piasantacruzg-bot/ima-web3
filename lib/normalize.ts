// Reusable normalization for creator data, shared by manual entry (Phase 2)
// and the CSV/XLSX importer (Phase 3) so both paths parse the same messy
// spreadsheet-style values the same way.

// "85K" -> 85000, "1.2M" -> 1200000, "2,500" -> 2500, "12000" -> 12000.
// Returns null (never NaN/0) when the input can't be parsed as a count —
// callers should treat null as "leave unset", not "zero".
export function parseFollowerCount(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input) : null;

  const trimmed = input.trim().replace(/,/g, "");
  if (!trimmed) return null;

  const match = trimmed.match(/^([\d.]+)\s*([kKmM]?)$/);
  if (!match) {
    const plain = Number(trimmed);
    return Number.isFinite(plain) ? Math.round(plain) : null;
  }

  const value = parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;

  const suffix = match[2].toLowerCase();
  const multiplier = suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : 1;
  return Math.round(value * multiplier);
}

// "4.8%" -> 4.8, "4.8" -> 4.8. Deliberately does NOT divide by 100 — the
// schema stores engagement_rate as a percentage value (4.8 meaning 4.8%),
// matching how the rest of the app displays and filters it.
export function parseEngagementRate(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;

  const trimmed = input.trim().replace(/%/g, "");
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

// "@username" -> "username". Also strips a leading "@" that survives a
// pasted URL fragment.
export function stripHandle(input: string | null | undefined): string {
  return (input ?? "").trim().replace(/^@/, "");
}
