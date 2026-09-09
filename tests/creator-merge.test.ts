import { describe, it, expect } from "vitest";
import { getMergeFields, unionArrays } from "@/lib/creator-merge";
import type { Creator } from "@/types/database";

function makeCreator(overrides: Partial<Creator>): Creator {
  return {
    id: "id",
    first_name: null,
    last_name: null,
    display_name: "Name",
    profile_image_url: null,
    email: null,
    phone: null,
    country: null,
    city: null,
    state_province: null,
    languages: [],
    gender: null,
    categories: [],
    niches: [],
    creator_type: null,
    status: "prospect",
    bio: null,
    notes: null,
    manager_name: null,
    manager_email: null,
    agency_name: null,
    rate_card_notes: null,
    brand_fit_score: null,
    internal_rating: null,
    is_demo: false,
    archived_at: null,
    custom_fields: {},
    created_by: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("getMergeFields", () => {
  it("flags a field as a conflict when both sides differ and are non-null", () => {
    const a = makeCreator({ email: "a@example.com" });
    const b = makeCreator({ email: "b@example.com" });
    const fields = getMergeFields(a, b);
    const emailField = fields.find((f) => f.key === "email");
    expect(emailField?.conflict).toBe(true);
  });

  it("does not flag a conflict when values are equal", () => {
    const a = makeCreator({ email: "same@example.com" });
    const b = makeCreator({ email: "same@example.com" });
    const fields = getMergeFields(a, b);
    expect(fields.find((f) => f.key === "email")?.conflict).toBe(false);
  });

  it("does not flag a conflict when only one side has a value", () => {
    const a = makeCreator({ phone: "555-0100" });
    const b = makeCreator({ phone: null });
    const fields = getMergeFields(a, b);
    expect(fields.find((f) => f.key === "phone")?.conflict).toBe(false);
  });
});

describe("unionArrays", () => {
  it("combines two arrays without duplicates", () => {
    expect(unionArrays(["Fashion", "Beauty"], ["Beauty", "Lifestyle"])).toEqual([
      "Fashion",
      "Beauty",
      "Lifestyle",
    ]);
  });

  it("handles empty arrays", () => {
    expect(unionArrays([], ["Fashion"])).toEqual(["Fashion"]);
    expect(unionArrays([], [])).toEqual([]);
  });
});
