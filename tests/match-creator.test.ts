import { describe, it, expect } from "vitest";
import {
  buildCreatorMatchIndex,
  matchImportRow,
  type ExistingCreatorForMatching,
} from "@/lib/import/match-creator";

function creator(overrides: Partial<ExistingCreatorForMatching>): ExistingCreatorForMatching {
  return {
    id: "id",
    display_name: "Name",
    email: null,
    phone: null,
    city: null,
    country: null,
    categories: [],
    socialAccounts: [],
    ...overrides,
  };
}

describe("matchImportRow — exact tier", () => {
  it("matches on platform_user_id even if the username changed", () => {
    const pool = [
      creator({
        id: "c1",
        display_name: "Maria Perez",
        socialAccounts: [{ platform: "instagram", username: "old_handle", platform_user_id: "IG123" }],
      }),
    ];
    const index = buildCreatorMatchIndex(pool);
    const matches = matchImportRow(
      {
        displayName: "Maria P.",
        socialAccounts: [{ platform: "instagram", username: "new_handle", platform_user_id: "IG123" }],
      },
      index
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ creatorId: "c1", confidence: "exact" });
  });

  it("matches on exact username + platform", () => {
    const pool = [
      creator({
        id: "c1",
        socialAccounts: [{ platform: "tiktok", username: "sofia.creates" }],
      }),
    ];
    const index = buildCreatorMatchIndex(pool);
    const matches = matchImportRow(
      { socialAccounts: [{ platform: "tiktok", username: "Sofia.Creates" }] },
      index
    );
    expect(matches[0]).toMatchObject({ creatorId: "c1", confidence: "exact" });
  });

  it("matches on exact email", () => {
    const pool = [creator({ id: "c1", email: "sofia@example.com" })];
    const index = buildCreatorMatchIndex(pool);
    const matches = matchImportRow({ email: "Sofia@Example.com" }, index);
    expect(matches[0]).toMatchObject({ creatorId: "c1", confidence: "exact" });
  });

  it("matches on exact phone", () => {
    const pool = [creator({ id: "c1", phone: "+15551234567" })];
    const index = buildCreatorMatchIndex(pool);
    const matches = matchImportRow({ phone: "+1 (555) 123-4567" }, index);
    expect(matches[0]).toMatchObject({ creatorId: "c1", confidence: "exact" });
  });
});

describe("matchImportRow — high tier", () => {
  it("flags multiple matching usernames across platforms as high confidence", () => {
    const pool = [
      creator({
        id: "c1",
        display_name: "Totally Different Name",
        socialAccounts: [
          { platform: "instagram", username: "sofia.creates" },
          { platform: "tiktok", username: "sofia.creates" },
        ],
      }),
    ];
    const index = buildCreatorMatchIndex(pool);
    // Row's platform labels are wrong/swapped, so neither hits the exact
    // username+platform tier, but the same username appears twice.
    const matches = matchImportRow(
      {
        socialAccounts: [
          { platform: "youtube", username: "sofia.creates" },
          { platform: "facebook", username: "sofia.creates" },
        ],
      },
      index
    );
    expect(matches[0]).toMatchObject({ creatorId: "c1", confidence: "high" });
  });

  it("flags a single cross-platform username match paired with a similar name as high confidence", () => {
    const pool = [
      creator({
        id: "c1",
        display_name: "Sofia Martinez",
        socialAccounts: [{ platform: "instagram", username: "sofia.m" }],
      }),
    ];
    const index = buildCreatorMatchIndex(pool);
    const matches = matchImportRow(
      {
        displayName: "Sofia Martinez",
        socialAccounts: [{ platform: "tiktok", username: "sofia.m" }],
      },
      index
    );
    expect(matches[0]).toMatchObject({ creatorId: "c1", confidence: "high" });
  });

  it("does not flag a single cross-platform username match without a similar name", () => {
    const pool = [
      creator({
        id: "c1",
        display_name: "Completely Unrelated Person",
        socialAccounts: [{ platform: "instagram", username: "sofia.m" }],
      }),
    ];
    const index = buildCreatorMatchIndex(pool);
    const matches = matchImportRow(
      {
        displayName: "Someone Else Entirely",
        socialAccounts: [{ platform: "tiktok", username: "sofia.m" }],
      },
      index
    );
    expect(matches).toHaveLength(0);
  });
});

describe("matchImportRow — low tier", () => {
  it("flags a similar name in the same city as low confidence", () => {
    const pool = [creator({ id: "c1", display_name: "Maria Perez", city: "Madrid" })];
    const index = buildCreatorMatchIndex(pool);
    const matches = matchImportRow({ displayName: "Maria Perez", city: "Madrid" }, index);
    expect(matches[0]).toMatchObject({ creatorId: "c1", confidence: "low" });
  });

  it("flags a similar name with shared category and country as low confidence", () => {
    const pool = [
      creator({
        id: "c1",
        display_name: "Maria Perez",
        country: "Spain",
        categories: ["Fashion"],
      }),
    ];
    const index = buildCreatorMatchIndex(pool);
    const matches = matchImportRow(
      { displayName: "Maria Perez", country: "Spain", categories: ["fashion"] },
      index
    );
    expect(matches[0]).toMatchObject({ creatorId: "c1", confidence: "low" });
  });

  it("never matches on name similarity alone", () => {
    const pool = [creator({ id: "c1", display_name: "Maria Perez" })];
    const index = buildCreatorMatchIndex(pool);
    const matches = matchImportRow({ displayName: "Maria Perez" }, index);
    expect(matches).toHaveLength(0);
  });

  it("does not match on an unrelated name even with a shared city", () => {
    const pool = [creator({ id: "c1", display_name: "Maria Perez", city: "Madrid" })];
    const index = buildCreatorMatchIndex(pool);
    const matches = matchImportRow({ displayName: "Someone Else Entirely", city: "Madrid" }, index);
    expect(matches).toHaveLength(0);
  });
});

describe("matchImportRow — no match", () => {
  it("returns an empty array when nothing corroborates", () => {
    const pool = [creator({ id: "c1", display_name: "Maria Perez", email: "maria@example.com" })];
    const index = buildCreatorMatchIndex(pool);
    const matches = matchImportRow({ displayName: "Someone Else", email: "other@example.com" }, index);
    expect(matches).toHaveLength(0);
  });
});
