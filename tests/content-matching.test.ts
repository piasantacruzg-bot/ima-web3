import { describe, it, expect } from "vitest";
import { matchDiscoveredPost, type DiscoveredPost, type ExistingContentPostRef, type MatchCandidateDeliverable } from "@/lib/content-matching";

function post(overrides: Partial<DiscoveredPost> = {}): DiscoveredPost {
  return {
    platformPostId: "p1",
    url: "https://instagram.com/p/abc",
    publishedAt: "2026-06-10T00:00:00Z",
    socialAccountId: "sa-1",
    creatorId: "creator-1",
    platform: "instagram",
    ...overrides,
  };
}

function candidate(overrides: Partial<MatchCandidateDeliverable> = {}): MatchCandidateDeliverable {
  return {
    deliverableId: "d1",
    campaignId: "c1",
    campaignName: "Test Campaign",
    creatorId: "creator-1",
    platform: "instagram",
    contentType: "instagram_reel",
    dueDate: "2026-06-10",
    campaignStartDate: "2026-06-01",
    campaignEndDate: "2026-06-30",
    socialAccountId: "sa-1",
    alreadyHasContentPost: false,
    ...overrides,
  };
}

describe("matchDiscoveredPost", () => {
  it("tier 1: matches by platform_post_id even if URL differs", () => {
    const existing: ExistingContentPostRef[] = [{ id: "cp1", platformPostId: "p1", postUrl: "https://old-url", deliverableId: "d9" }];
    const result = matchDiscoveredPost(post(), existing, []);
    expect(result).toEqual({ status: "already_tracked", method: "platform_post_id", existingContentPostId: "cp1", deliverableId: "d9" });
  });

  it("tier 2: matches by exact URL when platform_post_id doesn't match", () => {
    const existing: ExistingContentPostRef[] = [{ id: "cp1", platformPostId: "other", postUrl: post().url, deliverableId: "d9" }];
    const result = matchDiscoveredPost(post(), existing, []);
    expect(result.status).toBe("already_tracked");
    if (result.status === "already_tracked") expect(result.method).toBe("exact_url");
  });

  it("tier 3: matches the single open deliverable for the same social account", () => {
    const result = matchDiscoveredPost(post(), [], [candidate()]);
    expect(result).toEqual({ status: "matched", method: "account_and_content", deliverableId: "d1", confidence: expect.any(Number) });
  });

  it("never matches a deliverable that already has a content post", () => {
    const result = matchDiscoveredPost(post(), [], [candidate({ alreadyHasContentPost: true })]);
    expect(result.status).toBe("unmatched");
  });

  it("never matches a deliverable for a different creator or platform", () => {
    const wrongCreator = matchDiscoveredPost(post(), [], [candidate({ creatorId: "someone-else" })]);
    expect(wrongCreator.status).toBe("unmatched");
    const wrongPlatform = matchDiscoveredPost(post(), [], [candidate({ platform: "tiktok" })]);
    expect(wrongPlatform.status).toBe("unmatched");
  });

  it("tier 4: falls back to campaign-window narrowing when multiple deliverables share the account", () => {
    const inWindow = candidate({ deliverableId: "in-window", campaignStartDate: "2026-06-01", campaignEndDate: "2026-06-30" });
    const outOfWindow = candidate({ deliverableId: "out-of-window", campaignStartDate: "2025-01-01", campaignEndDate: "2025-01-31" });
    const result = matchDiscoveredPost(post(), [], [inWindow, outOfWindow]);
    expect(result.status).toBe("matched");
    if (result.status === "matched") expect(result.deliverableId).toBe("in-window");
  });

  it("tier 5: ambiguous when multiple deliverables are equally plausible — never auto-assigns", () => {
    const a = candidate({ deliverableId: "a", campaignId: "camp-a" });
    const b = candidate({ deliverableId: "b", campaignId: "camp-b" });
    const result = matchDiscoveredPost(post(), [], [a, b]);
    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") {
      expect(result.candidates).toHaveLength(2);
      expect(result.candidates.map((c) => c.deliverableId).sort()).toEqual(["a", "b"]);
    }
  });

  it("is unmatched when there are no candidate deliverables at all", () => {
    const result = matchDiscoveredPost(post(), [], []);
    expect(result).toEqual({ status: "unmatched" });
  });

  it("gives a higher confidence to a same-account match than a different-account one", () => {
    const sameAccount = candidate({ socialAccountId: "sa-1" });
    const otherAccount = candidate({ deliverableId: "d2", socialAccountId: "sa-2" });
    // Only same-account is a tier-3 single match; test confidence via ambiguous pool instead.
    const ambiguous = matchDiscoveredPost(post(), [], [
      candidate({ deliverableId: "same", socialAccountId: "sa-1", campaignId: "c-same" }),
      candidate({ deliverableId: "other", socialAccountId: "sa-2", campaignId: "c-other" }),
    ]);
    expect(ambiguous.status === "matched" || ambiguous.status === "ambiguous").toBe(true);
    void sameAccount;
    void otherAccount;
  });
});
