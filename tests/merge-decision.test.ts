import { describe, it, expect } from "vitest";
import { getImportMergeFields, resolveImportMerge, resolveImportArrayFields } from "@/lib/import/merge-decision";
import { planSocialAccountMerge } from "@/lib/import/social-account-merge";
import type { Creator, SocialAccount } from "@/types/database";
import type { NormalizedCreatorRowInput } from "@/lib/import/normalize-row";

function creator(overrides: Partial<Creator>): Creator {
  return {
    id: "c1",
    first_name: null,
    last_name: null,
    display_name: "Maria Perez",
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

function normalizedRow(overrides: Partial<NormalizedCreatorRowInput>): NormalizedCreatorRowInput {
  return {
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
    ...overrides,
  };
}

function socialAccount(overrides: Partial<SocialAccount>): SocialAccount {
  return {
    id: "sa1",
    creator_id: "c1",
    platform: "instagram",
    username: "maria.p",
    profile_url: null,
    platform_user_id: null,
    followers: 10_000,
    following: null,
    posts_count: null,
    engagement_rate: null,
    average_likes: null,
    average_comments: null,
    average_views: null,
    average_shares: null,
    average_saves: null,
    estimated_reach: null,
    account_type: null,
    is_connected: false,
    oauth_status: "not_connected",
    access_token_reference: null,
    token_expires_at: null,
    last_synced_at: null,
    sync_status: "never_synced",
    sync_error: null,
    is_demo: false,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("getImportMergeFields / resolveImportMerge", () => {
  it("flags a conflict only when both sides are non-empty and differ", () => {
    const existing = creator({ email: "a@example.com" });
    const imported = normalizedRow({ email: "b@example.com" });
    const fields = getImportMergeFields(existing, imported);
    expect(fields.find((f) => f.key === "email")?.conflict).toBe(true);
  });

  it("defaults a conflicting field to keeping the existing value", () => {
    const existing = creator({ email: "a@example.com" });
    const imported = normalizedRow({ email: "b@example.com" });
    const patch = resolveImportMerge(existing, imported, {});
    expect(patch.email).toBeUndefined();
  });

  it("applies the imported value when explicitly chosen", () => {
    const existing = creator({ email: "a@example.com" });
    const imported = normalizedRow({ email: "b@example.com" });
    const patch = resolveImportMerge(existing, imported, { email: "imported" });
    expect(patch.email).toBe("b@example.com");
  });

  it("auto-fills a blank existing field from the import", () => {
    const existing = creator({ city: null });
    const imported = normalizedRow({ city: "Madrid" });
    const patch = resolveImportMerge(existing, imported, {});
    expect(patch.city).toBe("Madrid");
  });

  it("never touches a field the import didn't provide", () => {
    const existing = creator({ city: "Madrid" });
    const imported = normalizedRow({ city: null });
    const patch = resolveImportMerge(existing, imported, {});
    expect(patch.city).toBeUndefined();
  });

  it("unions array fields from both sides", () => {
    const existing = creator({ categories: ["Fashion"] });
    const imported = normalizedRow({ categories: ["Beauty"] });
    expect(resolveImportArrayFields(existing, imported).categories).toEqual(["Fashion", "Beauty"]);
  });
});

describe("planSocialAccountMerge", () => {
  it("plans a new account when nothing matches", () => {
    const plan = planSocialAccountMerge([], [
      {
        platform: "tiktok",
        username: "maria.p",
        profile_url: null,
        platform_user_id: null,
        followers: 5000,
        following: null,
        posts_count: null,
        engagement_rate: null,
        average_likes: null,
        average_comments: null,
        average_views: null,
        average_shares: null,
        average_saves: null,
        estimated_reach: null,
      },
    ]);
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toUpdate).toHaveLength(0);
  });

  it("plans an update and captures the previous value for a changed metric", () => {
    const existing = [socialAccount({ followers: 10_000 })];
    const plan = planSocialAccountMerge(existing, [
      {
        platform: "instagram",
        username: "maria.p",
        profile_url: null,
        platform_user_id: null,
        followers: 85_000,
        following: null,
        posts_count: null,
        engagement_rate: null,
        average_likes: null,
        average_comments: null,
        average_views: null,
        average_shares: null,
        average_saves: null,
        estimated_reach: null,
      },
    ]);
    expect(plan.toUpdate).toHaveLength(1);
    expect(plan.toUpdate[0].patch.followers).toBe(85_000);
    expect(plan.toUpdate[0].previousValues.followers).toBe(10_000);
  });

  it("produces no update when nothing changed", () => {
    const existing = [socialAccount({ followers: 10_000, username: "maria.p" })];
    const plan = planSocialAccountMerge(existing, [
      {
        platform: "instagram",
        username: "maria.p",
        profile_url: null,
        platform_user_id: null,
        followers: 10_000,
        following: null,
        posts_count: null,
        engagement_rate: null,
        average_likes: null,
        average_comments: null,
        average_views: null,
        average_shares: null,
        average_saves: null,
        estimated_reach: null,
      },
    ]);
    expect(plan.toUpdate).toHaveLength(0);
  });

  it("matches by platform_user_id across a username rename", () => {
    const existing = [socialAccount({ username: "old_handle", platform_user_id: "IG123", followers: 10_000 })];
    const plan = planSocialAccountMerge(existing, [
      {
        platform: "instagram",
        username: "new_handle",
        profile_url: null,
        platform_user_id: "IG123",
        followers: 12_000,
        following: null,
        posts_count: null,
        engagement_rate: null,
        average_likes: null,
        average_comments: null,
        average_views: null,
        average_shares: null,
        average_saves: null,
        estimated_reach: null,
      },
    ]);
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.toUpdate[0].patch.username).toBe("new_handle");
    expect(plan.toUpdate[0].patch.followers).toBe(12_000);
  });
});
