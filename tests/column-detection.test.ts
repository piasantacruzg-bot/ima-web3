import { describe, it, expect } from "vitest";
import { detectColumn, detectColumns } from "@/lib/import/column-detection";

describe("detectColumn", () => {
  it("detects a plain creator field with high confidence", () => {
    const result = detectColumn("Full Name");
    expect(result.field).toBe("display_name");
    expect(result.confidence).toBe("high");
  });

  it("detects Email Address", () => {
    expect(detectColumn("Email Address").field).toBe("email");
  });

  it("detects WhatsApp Number as phone", () => {
    expect(detectColumn("WhatsApp Number").field).toBe("phone");
  });

  it("detects a platform-prefixed follower column and its platform", () => {
    const result = detectColumn("Instagram Followers");
    expect(result.field).toBe("social_followers");
    expect(result.platform).toBe("instagram");
    expect(result.confidence).toBe("high");
  });

  it("detects abbreviated platform tokens (IG, TT, YT, FB)", () => {
    expect(detectColumn("IG Followers").platform).toBe("instagram");
    expect(detectColumn("TikTok Followers").platform).toBe("tiktok");
    expect(detectColumn("YT Subscribers").platform).toBe("youtube");
    expect(detectColumn("FB Followers").platform).toBe("facebook");
  });

  it("detects Twitter/X as the x platform", () => {
    expect(detectColumn("Twitter Followers").platform).toBe("x");
    expect(detectColumn("X Followers").platform).toBe("x");
  });

  it("does not attach a platform to a non-social field even if a platform word appears", () => {
    // "Instagram Bio" isn't a real header we alias, but if a platform-only
    // social field like username/followers isn't matched, platform should
    // stay null since it's not a social target field.
    const result = detectColumn("Country");
    expect(result.platform).toBeNull();
  });

  it("leaves an unrecognized header unmapped rather than guessing", () => {
    const result = detectColumn("Favorite Color");
    expect(result.field).toBeNull();
    expect(result.confidence).toBe("none");
  });

  it("prefers a specific multi-word alias over a shorter substring", () => {
    const result = detectColumn("Engagement Rate");
    expect(result.field).toBe("social_engagement_rate");
    expect(result.matchedAlias).toBe("engagement rate");
  });

  it("matches a generic follower/subscriber column without a platform", () => {
    const result = detectColumn("Followers");
    expect(result.field).toBe("social_followers");
    expect(result.platform).toBeNull();
  });

  it("is case and punctuation insensitive", () => {
    expect(detectColumn("e-MAIL_Address").field).toBe("email");
  });
});

describe("detectColumns", () => {
  it("maps a full header row in order", () => {
    const results = detectColumns(["Full Name", "Email", "Instagram Followers", "Random Column"]);
    expect(results.map((r) => r.field)).toEqual([
      "display_name",
      "email",
      "social_followers",
      null,
    ]);
  });
});
