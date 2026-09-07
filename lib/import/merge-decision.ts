// Field-by-field merge resolution for the import wizard's "Review Matches"
// step, when a row matched an existing creator (spec: "safe field-by-field
// merge (existing/imported/both/skip per field)"). Reuses the same
// conflict-detection shape as the manual creator-merge workflow
// (lib/creator-merge.ts) so "conflict" means the same thing in both
// places, adapted to compare an existing Creator against one imported row
// (which usually only has a handful of fields populated, not the full
// record).

import type { Creator } from "@/types/database";
import type { NormalizedCreatorRowInput } from "@/lib/import/normalize-row";
import { unionArrays } from "@/lib/creator-merge";

export type ImportMergeFieldKey =
  | "display_name"
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "country"
  | "state_province"
  | "city"
  | "gender"
  | "creator_type"
  | "status"
  | "bio"
  | "notes"
  | "manager_name"
  | "manager_email"
  | "agency_name"
  | "rate_card_notes"
  | "internal_rating"
  | "brand_fit_score";

const FIELD_LABELS: Record<ImportMergeFieldKey, string> = {
  display_name: "Display name",
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  phone: "Phone",
  country: "Country",
  state_province: "State / Province",
  city: "City",
  gender: "Gender",
  creator_type: "Creator type",
  status: "Status",
  bio: "Bio",
  notes: "Notes",
  manager_name: "Manager name",
  manager_email: "Manager email",
  agency_name: "Agency name",
  rate_card_notes: "Rate card notes",
  internal_rating: "Internal rating",
  brand_fit_score: "Brand fit score",
};

export interface ImportMergeField {
  key: ImportMergeFieldKey;
  label: string;
  existingValue: unknown;
  importedValue: unknown;
  conflict: boolean;
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

// Fields where the existing record and the imported row disagree (both
// non-empty and different) need a decision — everything else resolves
// automatically (fill in a blank, keep agreement).
export function getImportMergeFields(
  existing: Creator,
  imported: NormalizedCreatorRowInput
): ImportMergeField[] {
  return (Object.keys(FIELD_LABELS) as ImportMergeFieldKey[]).map((key) => {
    const existingValue = existing[key];
    const importedValue = imported[key];
    const conflict = !isEmpty(existingValue) && !isEmpty(importedValue) && existingValue !== importedValue;
    return { key, label: FIELD_LABELS[key], existingValue, importedValue, conflict };
  });
}

export type FieldResolution = "existing" | "imported";

// Applies per-field decisions for conflicting fields (defaulting to
// "existing" — never silently overwrite, per the non-negotiable data
// principle) and auto-fills any blank existing field with the imported
// value. Returns only the fields that actually change.
export function resolveImportMerge(
  existing: Creator,
  imported: NormalizedCreatorRowInput,
  decisions: Partial<Record<ImportMergeFieldKey, FieldResolution>>
): Partial<Record<ImportMergeFieldKey, unknown>> {
  const patch: Partial<Record<ImportMergeFieldKey, unknown>> = {};

  for (const field of getImportMergeFields(existing, imported)) {
    if (isEmpty(field.importedValue)) continue;

    if (!field.conflict) {
      if (isEmpty(field.existingValue)) {
        patch[field.key] = field.importedValue;
      }
      continue;
    }

    const decision = decisions[field.key] ?? "existing";
    if (decision === "imported") {
      patch[field.key] = field.importedValue;
    }
  }

  return patch;
}

// Array fields always union both sides rather than needing a per-field
// decision — additive data never gets thrown away by a merge.
export function resolveImportArrayFields(
  existing: Creator,
  imported: NormalizedCreatorRowInput
): { categories: string[]; niches: string[]; languages: string[] } {
  return {
    categories: unionArrays(existing.categories, imported.categories),
    niches: unionArrays(existing.niches, imported.niches),
    languages: unionArrays(existing.languages, imported.languages),
  };
}
