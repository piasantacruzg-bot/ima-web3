// Row-level validation for the "Review Errors" wizard step. Deliberately
// mirrors the bounds in lib/validation/creator.ts (the manual Add/Edit
// Creator form) so an imported row is held to the same standard as a
// hand-entered one. A row with errors is never silently dropped — it's
// surfaced for the user to fix, skip, or import anyway once corrected.

import type { NormalizedCreatorRowInput } from "@/lib/import/normalize-row";

export function validateNormalizedRow(data: NormalizedCreatorRowInput): string[] {
  const errors: string[] = [];

  if (!data.display_name) {
    errors.push("Missing creator name");
  }
  if (data.internal_rating !== null && (data.internal_rating < 1 || data.internal_rating > 5)) {
    errors.push("Internal rating must be between 1 and 5");
  }
  if (data.brand_fit_score !== null && (data.brand_fit_score < 0 || data.brand_fit_score > 100)) {
    errors.push("Brand fit score must be between 0 and 100");
  }

  return errors;
}
