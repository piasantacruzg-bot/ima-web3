import { describe, it, expect } from "vitest";
import {
  parseFollowerCount,
  parseEngagementRate,
  stripHandle,
  normalizeWhitespace,
  normalizeCategoryList,
  normalizeEmail,
  normalizePhone,
} from "@/lib/normalize";

describe("parseFollowerCount", () => {
  it("parses K suffix", () => {
    expect(parseFollowerCount("85K")).toBe(85_000);
    expect(parseFollowerCount("85k")).toBe(85_000);
  });

  it("parses M suffix", () => {
    expect(parseFollowerCount("1.2M")).toBe(1_200_000);
  });

  it("parses comma-separated numbers", () => {
    expect(parseFollowerCount("2,500")).toBe(2500);
  });

  it("parses plain numbers and numeric input", () => {
    expect(parseFollowerCount("12000")).toBe(12000);
    expect(parseFollowerCount(12000)).toBe(12000);
  });

  it("returns null for empty/invalid input rather than 0 or NaN", () => {
    expect(parseFollowerCount("")).toBeNull();
    expect(parseFollowerCount(null)).toBeNull();
    expect(parseFollowerCount(undefined)).toBeNull();
    expect(parseFollowerCount("not a number")).toBeNull();
  });

  it("never returns a negative count for negative input strings unexpectedly", () => {
    // Not a spec requirement to reject negatives here (validation layer
    // does that) — just confirms the parser doesn't corrupt the sign.
    expect(parseFollowerCount("-500")).toBe(-500);
  });

  it("parses B (billion) suffix", () => {
    expect(parseFollowerCount("2.5B")).toBe(2_500_000_000);
    expect(parseFollowerCount("2.5b")).toBe(2_500_000_000);
  });
});

describe("parseEngagementRate", () => {
  it("parses percent sign without dividing by 100", () => {
    expect(parseEngagementRate("4.8%")).toBe(4.8);
  });

  it("parses plain numeric string", () => {
    expect(parseEngagementRate("4.8")).toBe(4.8);
  });

  it("parses numeric input directly", () => {
    expect(parseEngagementRate(4.8)).toBe(4.8);
  });

  it("returns null for empty/invalid input", () => {
    expect(parseEngagementRate("")).toBeNull();
    expect(parseEngagementRate(null)).toBeNull();
    expect(parseEngagementRate("n/a")).toBeNull();
  });

  it("parses European decimal comma", () => {
    expect(parseEngagementRate("4,8%")).toBe(4.8);
    expect(parseEngagementRate("4,8")).toBeCloseTo(4.8);
  });

  it("treats a bare fraction below 1 as a fraction-of-1, not a percentage", () => {
    expect(parseEngagementRate("0.045")).toBeCloseTo(4.5);
    expect(parseEngagementRate(0.045)).toBeCloseTo(4.5);
  });

  it("does not rescale a value already >= 1 with no percent sign", () => {
    expect(parseEngagementRate("4.5")).toBe(4.5);
    expect(parseEngagementRate(4.5)).toBe(4.5);
  });

  it("does not rescale a fraction below 1 when a percent sign is present", () => {
    // "0.5%" is a (very low) explicit percentage, not a fraction-of-1.
    expect(parseEngagementRate("0.5%")).toBe(0.5);
  });
});

describe("stripHandle", () => {
  it("removes a leading @", () => {
    expect(stripHandle("@creator")).toBe("creator");
  });

  it("leaves a handle without @ unchanged", () => {
    expect(stripHandle("creator")).toBe("creator");
  });

  it("trims whitespace", () => {
    expect(stripHandle("  @creator  ")).toBe("creator");
  });

  it("handles null/undefined", () => {
    expect(stripHandle(null)).toBe("");
    expect(stripHandle(undefined)).toBe("");
  });
});

describe("normalizeWhitespace", () => {
  it("collapses repeated whitespace and trims", () => {
    expect(normalizeWhitespace("  Jane   Doe  ")).toBe("Jane Doe");
  });

  it("handles null/undefined", () => {
    expect(normalizeWhitespace(null)).toBe("");
    expect(normalizeWhitespace(undefined)).toBe("");
  });
});

describe("normalizeCategoryList", () => {
  it("splits on comma/semicolon/pipe and trims", () => {
    expect(normalizeCategoryList("Fashion, Beauty; Lifestyle|Travel")).toEqual([
      "Fashion",
      "Beauty",
      "Lifestyle",
      "Travel",
    ]);
  });

  it("de-duplicates case-insensitively, keeping first-seen casing", () => {
    expect(normalizeCategoryList("Fashion, fashion, Lifestyle")).toEqual(["Fashion", "Lifestyle"]);
  });

  it("returns an empty array for empty/null input", () => {
    expect(normalizeCategoryList("")).toEqual([]);
    expect(normalizeCategoryList(null)).toEqual([]);
    expect(normalizeCategoryList(undefined)).toEqual([]);
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases a valid email", () => {
    expect(normalizeEmail("  Jane.Doe@Example.COM  ")).toBe("jane.doe@example.com");
  });

  it("returns null for an implausible email rather than guessing", () => {
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail("jane@")).toBeNull();
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("strips spaces/parens/hyphens/dots down to digits", () => {
    expect(normalizePhone("(555) 123-4567")).toBe("5551234567");
    expect(normalizePhone("555.123.4567")).toBe("5551234567");
  });

  it("preserves a leading + without inventing a country code", () => {
    expect(normalizePhone("+1 (555) 123-4567")).toBe("+15551234567");
  });

  it("returns null for empty/null input", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
});
