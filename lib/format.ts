export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    value
  );
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatCurrency(value: number | null | undefined, currency = "USD"): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// A missing metric is never rendered as 0 — "Not available" makes clear
// no capture exists yet, distinct from a genuinely recorded zero (spec
// section 6/42).
export function formatMetric(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Not available";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatMetricExact(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Not available";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatMetricRate(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return "Not available";
  return `${value.toFixed(digits)}%`;
}
