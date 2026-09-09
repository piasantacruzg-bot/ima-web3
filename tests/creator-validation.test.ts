import { describe, it, expect } from "vitest";
import { creatorFormSchema } from "@/lib/validation/creator";

const base = {
  display_name: "Test Creator",
  status: "prospect" as const,
};

describe("creatorFormSchema", () => {
  it("accepts a minimal valid submission", () => {
    const result = creatorFormSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("rejects a missing display name", () => {
    const result = creatorFormSchema.safeParse({ ...base, display_name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = creatorFormSchema.safeParse({ ...base, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("accepts an empty-string email (field left blank)", () => {
    const result = creatorFormSchema.safeParse({ ...base, email: "" });
    expect(result.success).toBe(true);
  });

  it("rejects an internal rating below 1", () => {
    const result = creatorFormSchema.safeParse({ ...base, internal_rating: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects an internal rating above 5", () => {
    const result = creatorFormSchema.safeParse({ ...base, internal_rating: "6" });
    expect(result.success).toBe(false);
  });

  it("accepts an internal rating within 1-5", () => {
    const result = creatorFormSchema.safeParse({ ...base, internal_rating: "4.5" });
    expect(result.success).toBe(true);
  });

  it("rejects a brand fit score above 100", () => {
    const result = creatorFormSchema.safeParse({ ...base, brand_fit_score: "150" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative brand fit score", () => {
    const result = creatorFormSchema.safeParse({ ...base, brand_fit_score: "-5" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown status", () => {
    const result = creatorFormSchema.safeParse({ ...base, status: "vip" });
    expect(result.success).toBe(false);
  });

  it("splits comma-separated categories into a trimmed array", () => {
    const result = creatorFormSchema.safeParse({ ...base, categories: "Fashion,  Beauty ,Lifestyle" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categories).toEqual(["Fashion", "Beauty", "Lifestyle"]);
    }
  });

  it("drops empty entries when splitting categories", () => {
    const result = creatorFormSchema.safeParse({ ...base, categories: "Fashion,,  ,Beauty" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categories).toEqual(["Fashion", "Beauty"]);
    }
  });

  it("defaults categories to an empty array when omitted", () => {
    const result = creatorFormSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categories).toEqual([]);
    }
  });
});
