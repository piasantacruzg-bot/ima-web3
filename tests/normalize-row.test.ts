import { describe, it, expect } from "vitest";
import { normalizeImportRow, type ColumnMappingEntry } from "@/lib/import/normalize-row";
import { validateNormalizedRow } from "@/lib/import/validate-row";

function mapping(entries: Partial<ColumnMappingEntry>[]): ColumnMappingEntry[] {
  return entries.map((e) => ({
    header: e.header ?? "",
    field: e.field ?? null,
    platform: e.platform ?? null,
    includeAsCustomField: e.includeAsCustomField ?? true,
  }));
}

describe("normalizeImportRow", () => {
  it("normalizes basic creator fields", () => {
    const raw = { Name: "  Maria   Perez ", Email: "MARIA@Example.com", Phone: "(555) 123-4567" };
    const map = mapping([
      { header: "Name", field: "display_name" },
      { header: "Email", field: "email" },
      { header: "Phone", field: "phone" },
    ]);
    const { data, warnings } = normalizeImportRow(raw, map);
    expect(data.display_name).toBe("Maria Perez");
    expect(data.email).toBe("maria@example.com");
    expect(data.phone).toBe("5551234567");
    expect(warnings).toEqual([]);
  });

  it("derives display_name from first/last name when no name column exists", () => {
    const raw = { First: "Maria", Last: "Perez" };
    const map = mapping([
      { header: "First", field: "first_name" },
      { header: "Last", field: "last_name" },
    ]);
    const { data } = normalizeImportRow(raw, map);
    expect(data.display_name).toBe("Maria Perez");
  });

  it("warns on an invalid email rather than guessing", () => {
    const raw = { Name: "Maria", Email: "not-an-email" };
    const map = mapping([
      { header: "Name", field: "display_name" },
      { header: "Email", field: "email" },
    ]);
    const { data, warnings } = normalizeImportRow(raw, map);
    expect(data.email).toBeNull();
    expect(warnings.some((w) => w.includes("Invalid email"))).toBe(true);
  });

  it("groups platform-prefixed columns into one social account", () => {
    const raw = { Name: "Maria", "Instagram Handle": "@maria.p", "Instagram Followers": "85K" };
    const map = mapping([
      { header: "Name", field: "display_name" },
      { header: "Instagram Handle", field: "social_username", platform: "instagram" },
      { header: "Instagram Followers", field: "social_followers", platform: "instagram" },
    ]);
    const { data } = normalizeImportRow(raw, map);
    expect(data.socialAccounts).toEqual([
      expect.objectContaining({ platform: "instagram", username: "maria.p", followers: 85_000 }),
    ]);
  });

  it("uses a declared Platform column for generic username/followers columns", () => {
    const raw = { Name: "Maria", Platform: "TikTok", Username: "maria.p", Followers: "40000" };
    const map = mapping([
      { header: "Name", field: "display_name" },
      { header: "Platform", field: "social_platform" },
      { header: "Username", field: "social_username" },
      { header: "Followers", field: "social_followers" },
    ]);
    const { data, warnings } = normalizeImportRow(raw, map);
    expect(data.socialAccounts).toEqual([
      expect.objectContaining({ platform: "tiktok", username: "maria.p", followers: 40_000 }),
    ]);
    expect(warnings).toEqual([]);
  });

  it("warns and drops a social bucket when the platform can't be determined", () => {
    const raw = { Name: "Maria", Username: "maria.p", Followers: "40000" };
    const map = mapping([
      { header: "Name", field: "display_name" },
      { header: "Username", field: "social_username" },
      { header: "Followers", field: "social_followers" },
    ]);
    const { data, warnings } = normalizeImportRow(raw, map);
    expect(data.socialAccounts).toEqual([]);
    expect(warnings.some((w) => w.includes("Could not determine a platform"))).toBe(true);
  });

  it("keeps an unmapped column as a custom field by default", () => {
    const raw = { Name: "Maria", "Rate Card": "$500/post" };
    const map = mapping([
      { header: "Name", field: "display_name" },
      { header: "Rate Card", field: null },
    ]);
    const { data } = normalizeImportRow(raw, map);
    expect(data.customFields).toEqual({ "Rate Card": "$500/post" });
  });

  it("discards an unmapped column only when explicitly marked ignored", () => {
    const raw = { Name: "Maria", Junk: "whatever" };
    const map = mapping([
      { header: "Name", field: "display_name" },
      { header: "Junk", field: null, includeAsCustomField: false },
    ]);
    const { data } = normalizeImportRow(raw, map);
    expect(data.customFields).toEqual({});
  });

  it("normalizes categories and dedupes case-insensitively", () => {
    const raw = { Name: "Maria", Categories: "Fashion, fashion, Beauty" };
    const map = mapping([
      { header: "Name", field: "display_name" },
      { header: "Categories", field: "categories" },
    ]);
    const { data } = normalizeImportRow(raw, map);
    expect(data.categories).toEqual(["Fashion", "Beauty"]);
  });

  it("maps creator type and status aliases", () => {
    const raw = { Name: "Maria", Tier: "Nano Influencer", Status: "Activo" };
    const map = mapping([
      { header: "Name", field: "display_name" },
      { header: "Tier", field: "creator_type" },
      { header: "Status", field: "status" },
    ]);
    const { data, warnings } = normalizeImportRow(raw, map);
    expect(data.creator_type).toBe("nano");
    expect(data.status).toBe("active");
    expect(warnings).toEqual([]);
  });

  it("warns on an unrecognized status rather than guessing", () => {
    const raw = { Name: "Maria", Status: "Maybe Later" };
    const map = mapping([
      { header: "Name", field: "display_name" },
      { header: "Status", field: "status" },
    ]);
    const { data, warnings } = normalizeImportRow(raw, map);
    expect(data.status).toBeNull();
    expect(warnings.some((w) => w.includes("Unrecognized status"))).toBe(true);
  });
});

describe("validateNormalizedRow", () => {
  it("flags a missing name", () => {
    const errors = validateNormalizedRow({
      first_name: null,
      last_name: null,
      display_name: null,
      email: null,
      phone: null,
      country: null,
      city: null,
      state_province: null,
      gender: null,
      languages: [],
      categories: [],
      niches: [],
      creator_type: null,
      status: null,
      bio: null,
      notes: null,
      manager_name: null,
      manager_email: null,
      agency_name: null,
      rate_card_notes: null,
      brand_fit_score: null,
      internal_rating: null,
      tags: [],
      socialAccounts: [],
      customFields: {},
    });
    expect(errors).toContain("Missing creator name");
  });

  it("flags an out-of-range internal rating and brand fit score", () => {
    const errors = validateNormalizedRow({
      first_name: null,
      last_name: null,
      display_name: "Maria Perez",
      email: null,
      phone: null,
      country: null,
      city: null,
      state_province: null,
      gender: null,
      languages: [],
      categories: [],
      niches: [],
      creator_type: null,
      status: null,
      bio: null,
      notes: null,
      manager_name: null,
      manager_email: null,
      agency_name: null,
      rate_card_notes: null,
      brand_fit_score: 150,
      internal_rating: 9,
      tags: [],
      socialAccounts: [],
      customFields: {},
    });
    expect(errors).toContain("Internal rating must be between 1 and 5");
    expect(errors).toContain("Brand fit score must be between 0 and 100");
  });

  it("passes a well-formed row with no errors", () => {
    const errors = validateNormalizedRow({
      first_name: null,
      last_name: null,
      display_name: "Maria Perez",
      email: "maria@example.com",
      phone: null,
      country: null,
      city: null,
      state_province: null,
      gender: null,
      languages: [],
      categories: [],
      niches: [],
      creator_type: null,
      status: null,
      bio: null,
      notes: null,
      manager_name: null,
      manager_email: null,
      agency_name: null,
      rate_card_notes: null,
      brand_fit_score: 80,
      internal_rating: 4,
      tags: [],
      socialAccounts: [],
      customFields: {},
    });
    expect(errors).toEqual([]);
  });
});
