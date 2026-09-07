// Exercises the full parse -> detect -> normalize -> validate pipeline
// against the named fixture scenarios in tests/fixtures/ (spec: "extensive
// test fixtures" covering messy real-world spreadsheet variations) plus the
// ~1000-row acceptance fixture Influencers_2025.xlsx.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseImportFile } from "@/lib/import/parse-file";
import { detectColumns, type ImportTargetField } from "@/lib/import/column-detection";
import { normalizeImportRow, type ColumnMappingEntry } from "@/lib/import/normalize-row";
import { validateNormalizedRow } from "@/lib/import/validate-row";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

function fileFromFixture(name: string): File {
  const filePath = path.join(FIXTURES_DIR, name);
  const buffer = fs.readFileSync(filePath);
  const type = name.endsWith(".csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return new File([buffer], name, { type });
}

function autoMapping(headers: string[]): ColumnMappingEntry[] {
  return detectColumns(headers).map((d) => ({
    header: d.header,
    field: d.field,
    platform: d.platform,
    includeAsCustomField: d.field === null,
  }));
}

async function processFixture(name: string) {
  const file = fileFromFixture(name);
  const parsed = await parseImportFile(file);
  const sheet = parsed.sheets[0];
  const mapping = autoMapping(sheet.headers);
  const rows = sheet.rows.map((raw) => {
    const { data, warnings } = normalizeImportRow(raw, mapping);
    const errors = validateNormalizedRow(data);
    return { raw, data, warnings, errors };
  });
  return { parsed, mapping, rows };
}

describe("fixture: 01_clean_basic", () => {
  it("normalizes every row with no warnings or errors", async () => {
    const { rows } = await processFixture("01_clean_basic.csv");
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.errors).toEqual([]);
      expect(row.data.display_name).toBeTruthy();
      expect(row.data.email).toBeTruthy();
    }
  });
});

describe("fixture: 02_header_aliases", () => {
  it("recognizes aliased headers (Full Name, WhatsApp Number, Influencer Tier, Creator Status)", async () => {
    const { rows } = await processFixture("02_header_aliases.csv");
    expect(rows[0].data.display_name).toBe("Sofia Martinez");
    expect(rows[0].data.phone).toBe("5551234567");
    expect(rows[0].data.creator_type).toBe("micro");
    expect(rows[0].data.status).toBe("active");
    expect(rows[1].data.creator_type).toBe("nano");
    expect(rows[1].data.status).toBe("prospect");
  });
});

describe("fixture: 03_follower_suffixes", () => {
  it("parses K/M/B suffixes and comma-thousands consistently", async () => {
    const { rows } = await processFixture("03_follower_suffixes.csv");
    const followers = rows.map((r) => r.data.socialAccounts[0]?.followers);
    expect(followers).toEqual([950, 85_000, 1_200_000, 2_500_000_000, 12_500]);
  });
});

describe("fixture: 04_engagement_formats", () => {
  it("parses percent signs, European decimal commas, and bare fractions consistently", async () => {
    const { rows } = await processFixture("04_engagement_formats.csv");
    const rates = rows.map((r) => r.data.socialAccounts[0]?.engagement_rate);
    expect(rates[0]).toBeCloseTo(4.8);
    expect(rates[1]).toBeCloseTo(4.8);
    expect(rates[2]).toBeCloseTo(4.5);
    expect(rates[3]).toBeCloseTo(4.5);
  });
});

describe("fixture: 05_multi_platform_wide", () => {
  it("splits platform-prefixed columns into separate social accounts", async () => {
    const { rows } = await processFixture("05_multi_platform_wide.csv");
    const platforms = rows[0].data.socialAccounts.map((a) => a.platform).sort();
    expect(platforms).toEqual(["instagram", "tiktok", "youtube"]);
  });
});

describe("fixture: 06_platform_column_long", () => {
  it("uses a declared Platform column for generic username/followers columns", async () => {
    const { rows } = await processFixture("06_platform_column_long.csv");
    expect(rows[0].data.socialAccounts[0]).toMatchObject({ platform: "tiktok", followers: 40_000 });
    expect(rows[1].data.socialAccounts[0]).toMatchObject({ platform: "instagram", followers: 60_000 });
  });
});

describe("fixture: 07_duplicate_rows_in_file", () => {
  it("normalizes visually-identical rows to the same identity", async () => {
    const { rows } = await processFixture("07_duplicate_rows_in_file.csv");
    const emails = rows.map((r) => r.data.email);
    const handles = rows.map((r) => r.data.socialAccounts[0]?.username.toLowerCase());
    expect(new Set(emails).size).toBe(1);
    expect(new Set(handles).size).toBe(1);
  });
});

describe("fixture: 08_invalid_data", () => {
  it("flags a missing name and out-of-range rating/brand-fit without blocking valid rows", async () => {
    const { rows } = await processFixture("08_invalid_data.csv");
    expect(rows[0].errors).toContain("Missing creator name");
    expect(rows[0].errors).toContain("Internal rating must be between 1 and 5");
    expect(rows[0].errors).toContain("Brand fit score must be between 0 and 100");
    expect(rows[1].errors).toEqual([]);
    expect(rows[2].errors.length).toBeGreaterThan(0);
  });
});

describe("fixture: 09_unicode_names", () => {
  it("preserves non-Latin and accented characters exactly", async () => {
    const { rows } = await processFixture("09_unicode_names.csv");
    const names = rows.map((r) => r.data.display_name);
    expect(names).toContain("François Müller");
    expect(names).toContain("田中愛子");
    expect(names).toContain("Zoë Øberg");
    expect(names).toContain("José García Núñez");
  });
});

describe("fixture: 10_unmapped_custom_columns", () => {
  it("keeps a genuinely unmapped column as a custom field rather than discarding it", async () => {
    const { rows } = await processFixture("10_unmapped_custom_columns.csv");
    // "Rate Card" has a known alias (rate_card_notes) — it's expected to
    // map to a real field, not end up as a custom field.
    expect(rows[0].data.rate_card_notes).toBe("$500/post");
    expect(rows[0].data.customFields).toEqual({
      "Audience Age": "18-24",
      "Internal Priority Flag": "High",
    });
  });
});

describe("fixture: 11_sparse_rows", () => {
  it("handles rows with mostly-blank cells and blank lines without crashing", async () => {
    const { rows } = await processFixture("11_sparse_rows.csv");
    expect(rows).toHaveLength(3);
    expect(rows[0].data.display_name).toBe("Sparse Creator One");
    expect(rows[0].data.email).toBeNull();
    expect(rows[2].data.city).toBe("Madrid");
  });
});

describe("fixture: Influencers_2025.xlsx (acceptance test, ~1000 rows)", () => {
  it("parses, normalizes, and validates every row without stopping on bad ones", async () => {
    const { parsed, rows } = await processFixture("Influencers_2025.xlsx");
    expect(parsed.fileType).toBe("xlsx");
    expect(rows).toHaveLength(1000);

    const withErrors = rows.filter((r) => r.errors.length > 0);
    const withoutErrors = rows.filter((r) => r.errors.length === 0);

    // A handful of intentionally-bad rows exist (missing name / bad
    // rating) — they should be flagged, not silently dropped, and must not
    // prevent the rest of the file from normalizing cleanly.
    expect(withErrors.length).toBeGreaterThan(0);
    expect(withErrors.length).toBeLessThan(50);
    expect(withoutErrors.length).toBeGreaterThan(900);

    for (const row of withoutErrors) {
      expect(row.data.display_name).toBeTruthy();
      expect(row.data.socialAccounts[0]?.followers).not.toBeNull();
    }
  });
});
