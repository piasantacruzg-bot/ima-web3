import type { Creator } from "@/types/database";

export interface MergeField {
  key: keyof Creator;
  label: string;
  valueA: unknown;
  valueB: unknown;
  conflict: boolean;
}

const SCALAR_FIELDS: { key: keyof Creator; label: string }[] = [
  { key: "display_name", label: "Display name" },
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "country", label: "Country" },
  { key: "state_province", label: "State / Province" },
  { key: "city", label: "City" },
  { key: "gender", label: "Gender" },
  { key: "creator_type", label: "Creator type" },
  { key: "status", label: "Status" },
  { key: "bio", label: "Bio" },
  { key: "manager_name", label: "Manager name" },
  { key: "manager_email", label: "Manager email" },
  { key: "agency_name", label: "Agency name" },
  { key: "rate_card_notes", label: "Rate card notes" },
  { key: "internal_rating", label: "Internal rating" },
  { key: "brand_fit_score", label: "Brand fit score" },
];

// Fields where A and B disagree (both non-null and different) need the
// user to pick one — spec section 17: "never silently overwrite
// information." Fields that agree, or where only one side has a value,
// are resolved automatically (prefer whichever is set).
export function getMergeFields(a: Creator, b: Creator): MergeField[] {
  return SCALAR_FIELDS.map(({ key, label }) => {
    const valueA = a[key];
    const valueB = b[key];
    const conflict = valueA !== null && valueB !== null && valueA !== valueB;
    return { key, label, valueA, valueB, conflict };
  });
}

export function unionArrays(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}
