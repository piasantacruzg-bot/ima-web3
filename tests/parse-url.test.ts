import { describe, it, expect } from "vitest";
import { parseSocialProfileUrl } from "@/lib/social/parse-url";

describe("parseSocialProfileUrl", () => {
  it("parses an Instagram URL", () => {
    expect(parseSocialProfileUrl("https://instagram.com/username")).toEqual({
      platform: "instagram",
      username: "username",
      profileUrl: "https://instagram.com/username",
    });
  });

  it("parses an Instagram URL with www and trailing slash", () => {
    const result = parseSocialProfileUrl("https://www.instagram.com/username/");
    expect(result?.platform).toBe("instagram");
    expect(result?.username).toBe("username");
  });

  it("parses a TikTok URL with @ handle", () => {
    const result = parseSocialProfileUrl("https://tiktok.com/@username");
    expect(result?.platform).toBe("tiktok");
    expect(result?.username).toBe("username");
  });

  it("parses an X URL (x.com)", () => {
    const result = parseSocialProfileUrl("https://x.com/username");
    expect(result?.platform).toBe("x");
    expect(result?.username).toBe("username");
  });

  it("parses a legacy twitter.com URL as X", () => {
    const result = parseSocialProfileUrl("https://twitter.com/username");
    expect(result?.platform).toBe("x");
  });

  it("parses a YouTube @handle URL", () => {
    const result = parseSocialProfileUrl("https://youtube.com/@channelname");
    expect(result?.platform).toBe("youtube");
    expect(result?.username).toBe("channelname");
  });

  it("parses a Facebook URL", () => {
    const result = parseSocialProfileUrl("https://facebook.com/username");
    expect(result?.platform).toBe("facebook");
  });

  it("accepts a bare domain without protocol", () => {
    const result = parseSocialProfileUrl("instagram.com/username");
    expect(result?.platform).toBe("instagram");
  });

  it("returns null for an unrecognized domain", () => {
    expect(parseSocialProfileUrl("https://example.com/username")).toBeNull();
  });

  it("returns null for an empty or garbage string", () => {
    expect(parseSocialProfileUrl("")).toBeNull();
    expect(parseSocialProfileUrl("not a url at all !!")).toBeNull();
  });

  it("returns null for a profile root with no username segment", () => {
    expect(parseSocialProfileUrl("https://instagram.com/")).toBeNull();
  });
});
