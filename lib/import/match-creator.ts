// Deterministic duplicate-matching engine for the CSV/XLSX importer
// (Phase 3). Pure in-memory logic — no Supabase calls — so it can be unit
// tested and so a batch import can build one lookup index for the whole
// existing creator pool up front and match thousands of rows against it
// without a per-row database round trip.
//
// Confidence hierarchy (spec: "duplicate-matching engine with an explicit
// confidence hierarchy"). Every tier below "exact" requires at least one
// corroborating signal alongside name similarity — name similarity alone
// never produces a match, per the non-negotiable "never merge on name
// similarity alone" principle.

import type { SocialPlatform } from "@/types/database";
import { similarity, NAME_SIMILARITY_THRESHOLD } from "@/lib/string-similarity";
import { normalizeEmail, normalizePhone, normalizeWhitespace } from "@/lib/normalize";

export type MatchConfidence = "exact" | "high" | "low";

export interface MatchableSocialAccount {
  platform: SocialPlatform;
  username: string;
  platform_user_id?: string | null;
}

export interface ExistingCreatorForMatching {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  categories: string[];
  socialAccounts: MatchableSocialAccount[];
}

export interface ImportRowForMatching {
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  categories?: string[];
  socialAccounts?: MatchableSocialAccount[];
}

export interface CreatorMatch {
  creatorId: string;
  confidence: MatchConfidence;
  reasons: string[];
}

function usernameKey(platform: SocialPlatform, username: string): string {
  return `${platform}:${normalizeWhitespace(username).toLowerCase()}`;
}

function platformUserIdKey(platform: SocialPlatform, platformUserId: string): string {
  return `${platform}:${platformUserId.trim()}`;
}

// Pre-built lookup structure for one existing-creator pool. Every field
// used at the "exact" tier gets an O(1) index. The "low" tier still needs a
// scan, but rather than blocking it by name (which degenerates badly when
// many creators share a first letter — or, worse, a whole prefix, as any
// pool with sequentially-numbered demo/test names does), it's blocked by
// the *other* required signal instead: a row can only match at the "low"
// tier alongside a shared city or a shared country+category, so indexing
// creators by those bounds the scan to candidates that could possibly
// qualify, independent of how many creators share a name prefix.
export interface CreatorMatchIndex {
  byId: Map<string, ExistingCreatorForMatching>;
  byPlatformUserId: Map<string, string>;
  byUsernamePlatform: Map<string, string>;
  byUsernameAny: Map<string, Set<string>>;
  byEmail: Map<string, string>;
  byPhone: Map<string, string>;
  byCity: Map<string, Set<string>>;
  byCountryCategory: Map<string, Set<string>>;
}

export function buildCreatorMatchIndex(pool: ExistingCreatorForMatching[]): CreatorMatchIndex {
  const index: CreatorMatchIndex = {
    byId: new Map(),
    byPlatformUserId: new Map(),
    byUsernamePlatform: new Map(),
    byUsernameAny: new Map(),
    byEmail: new Map(),
    byPhone: new Map(),
    byCity: new Map(),
    byCountryCategory: new Map(),
  };

  for (const creator of pool) {
    index.byId.set(creator.id, creator);

    if (creator.email) {
      const email = normalizeEmail(creator.email);
      if (email) index.byEmail.set(email, creator.id);
    }
    if (creator.phone) {
      const phone = normalizePhone(creator.phone);
      if (phone) index.byPhone.set(phone, creator.id);
    }

    for (const account of creator.socialAccounts) {
      if (account.platform_user_id) {
        index.byPlatformUserId.set(
          platformUserIdKey(account.platform, account.platform_user_id),
          creator.id
        );
      }
      index.byUsernamePlatform.set(usernameKey(account.platform, account.username), creator.id);

      const anyKey = normalizeWhitespace(account.username).toLowerCase();
      if (anyKey) {
        const set = index.byUsernameAny.get(anyKey) ?? new Set<string>();
        set.add(creator.id);
        index.byUsernameAny.set(anyKey, set);
      }
    }

    if (creator.city) {
      const cityKey = normalizeWhitespace(creator.city).toLowerCase();
      const set = index.byCity.get(cityKey) ?? new Set<string>();
      set.add(creator.id);
      index.byCity.set(cityKey, set);
    }
    if (creator.country) {
      const countryKey = normalizeWhitespace(creator.country).toLowerCase();
      for (const category of creator.categories) {
        const key = `${countryKey}|${category.toLowerCase()}`;
        const set = index.byCountryCategory.get(key) ?? new Set<string>();
        set.add(creator.id);
        index.byCountryCategory.set(key, set);
      }
    }
  }

  return index;
}

function addReason(
  reasonsByCreator: Map<string, { confidence: MatchConfidence; reasons: string[] }>,
  creatorId: string,
  confidence: MatchConfidence,
  reason: string
) {
  const existing = reasonsByCreator.get(creatorId);
  if (!existing) {
    reasonsByCreator.set(creatorId, { confidence, reasons: [reason] });
    return;
  }
  existing.reasons.push(reason);
  // "exact" beats "high" beats "low" — a creator that already matched at a
  // higher tier never gets downgraded by a weaker corroborating reason.
  const rank: Record<MatchConfidence, number> = { exact: 3, high: 2, low: 1 };
  if (rank[confidence] > rank[existing.confidence]) existing.confidence = confidence;
}

// Matches one import row against a pre-built pool index. Returns every
// creator with at least one qualifying signal, highest confidence first —
// never just the single "best" guess, since the review UI needs to show
// alternates too.
export function matchImportRow(
  row: ImportRowForMatching,
  index: CreatorMatchIndex
): CreatorMatch[] {
  const results = new Map<string, { confidence: MatchConfidence; reasons: string[] }>();
  const accounts = row.socialAccounts ?? [];

  // --- Exact tier ---------------------------------------------------
  // E1: platform_user_id match (spec: "highest: platform_user_id") — the
  // single most reliable signal, since usernames can be renamed but a
  // platform's internal account id can't.
  for (const account of accounts) {
    if (!account.platform_user_id) continue;
    const creatorId = index.byPlatformUserId.get(
      platformUserIdKey(account.platform, account.platform_user_id)
    );
    if (creatorId) {
      addReason(
        results,
        creatorId,
        "exact",
        `Same ${account.platform} account ID`
      );
    }
  }

  // E2: exact username + platform match.
  for (const account of accounts) {
    const creatorId = index.byUsernamePlatform.get(usernameKey(account.platform, account.username));
    if (creatorId) {
      addReason(results, creatorId, "exact", `Same ${account.platform} handle @${account.username}`);
    }
  }

  // E3: exact email match.
  const email = normalizeEmail(row.email);
  if (email) {
    const creatorId = index.byEmail.get(email);
    if (creatorId) addReason(results, creatorId, "exact", `Same email (${email})`);
  }

  // E4: exact phone match.
  const phone = normalizePhone(row.phone);
  if (phone) {
    const creatorId = index.byPhone.get(phone);
    if (creatorId) addReason(results, creatorId, "exact", `Same phone (${phone})`);
  }

  // --- High tier ------------------------------------------------------
  // H1: two or more of the row's usernames (any platform) belong to the
  // same existing creator (spec: "multiple matching usernames").
  const usernameHitCounts = new Map<string, number>();
  for (const account of accounts) {
    const anyKey = normalizeWhitespace(account.username).toLowerCase();
    if (!anyKey) continue;
    for (const creatorId of index.byUsernameAny.get(anyKey) ?? []) {
      usernameHitCounts.set(creatorId, (usernameHitCounts.get(creatorId) ?? 0) + 1);
    }
  }
  for (const [creatorId, count] of usernameHitCounts) {
    if (count >= 2) {
      addReason(results, creatorId, "high", "Multiple matching social handles");
    }
  }

  const rowName = row.displayName ? normalizeWhitespace(row.displayName) : "";

  // H3: a username matches on some platform (but not confirmed on the same
  // platform, so it didn't qualify for E2) *and* the name is similar (spec:
  // "username+similar name"). A username match alone is never sufficient.
  if (rowName) {
    for (const account of accounts) {
      const anyKey = normalizeWhitespace(account.username).toLowerCase();
      if (!anyKey) continue;
      for (const creatorId of index.byUsernameAny.get(anyKey) ?? []) {
        if (results.get(creatorId)?.confidence === "exact") continue;
        const creator = index.byId.get(creatorId);
        if (!creator) continue;
        if (similarity(creator.display_name, rowName) >= NAME_SIMILARITY_THRESHOLD) {
          addReason(results, creatorId, "high", `Matching handle @${account.username} and similar name`);
        }
      }
    }
  }

  // --- Low tier ---------------------------------------------------------
  // Name similarity is never sufficient by itself: it must be paired with
  // a shared city (L1: "name+city") or a shared category + country (L2:
  // "name+category+location"). Rather than scanning the whole pool (or
  // blocking by name, which degenerates badly whenever many creators share
  // a prefix), each rule only scans the candidates that already share its
  // required signal — bounding the work to what could possibly qualify.
  if (rowName) {
    const rowCity = row.city ? normalizeWhitespace(row.city).toLowerCase() : "";
    const rowCountry = row.country ? normalizeWhitespace(row.country).toLowerCase() : "";
    const rowCategories = row.categories ?? [];

    if (rowCity) {
      for (const creatorId of index.byCity.get(rowCity) ?? []) {
        if (results.get(creatorId)?.confidence === "exact") continue;
        const creator = index.byId.get(creatorId);
        if (!creator) continue;
        if (similarity(creator.display_name, rowName) >= NAME_SIMILARITY_THRESHOLD) {
          addReason(results, creatorId, "low", `Similar name "${creator.display_name}" in the same city`);
        }
      }
    }

    if (rowCountry && rowCategories.length > 0) {
      const candidateIds = new Set<string>();
      for (const category of rowCategories) {
        for (const creatorId of index.byCountryCategory.get(`${rowCountry}|${category.toLowerCase()}`) ?? []) {
          candidateIds.add(creatorId);
        }
      }
      for (const creatorId of candidateIds) {
        if (results.get(creatorId)?.confidence === "exact") continue;
        const creator = index.byId.get(creatorId);
        if (!creator) continue;
        if (similarity(creator.display_name, rowName) >= NAME_SIMILARITY_THRESHOLD) {
          addReason(
            results,
            creatorId,
            "low",
            `Similar name "${creator.display_name}" with a shared category and location`
          );
        }
      }
    }
  }

  const confidenceRank: Record<MatchConfidence, number> = { exact: 3, high: 2, low: 1 };
  return [...results.entries()]
    .map(([creatorId, { confidence, reasons }]) => ({ creatorId, confidence, reasons }))
    .sort((a, b) => confidenceRank[b.confidence] - confidenceRank[a.confidence]);
}
