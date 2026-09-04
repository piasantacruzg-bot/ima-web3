import { describe, it, expect } from "vitest";
import { parseFollowerCount, parseEngagementRate, stripHandle } from "@/lib/normalize";

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
