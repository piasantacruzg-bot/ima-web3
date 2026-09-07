// Plans how an existing creator's social accounts should change when an
// import row brings new platform data — pure logic, no I/O, so the server
// action just executes the plan.
//
// Performance numbers (followers, engagement, etc.) are never blindly
// overwritten: whenever an import would change one, the plan carries the
// *previous* value so the caller can record it as a
// creator_performance_snapshot before applying the new value (spec:
// "historical performance preservation via snapshots — never overwrite").
// Identity fields (username, profile url, platform id) are treated as
// current-state, not historical, since a legitimate rename/URL change
// isn't something to preserve a "previous version" of.

import type { SocialAccount, SocialPlatform } from "@/types/database";
import type { NormalizedSocialAccountInput } from "@/lib/import/normalize-row";

const PERFORMANCE_FIELDS = [
  "followers",
  "following",
  "posts_count",
  "engagement_rate",
  "average_likes",
  "average_comments",
  "average_views",
  "average_shares",
  "average_saves",
  "estimated_reach",
] as const;

type PerformanceField = (typeof PERFORMANCE_FIELDS)[number];

export interface SocialAccountUpdatePlan {
  accountId: string;
  patch: Partial<Record<PerformanceField | "username" | "profile_url" | "platform_user_id", unknown>>;
  previousValues: Partial<Record<PerformanceField, number | null>>;
}

export interface SocialAccountMergePlan {
  toCreate: NormalizedSocialAccountInput[];
  toUpdate: SocialAccountUpdatePlan[];
}

function findMatch(
  existing: SocialAccount[],
  imported: NormalizedSocialAccountInput
): SocialAccount | undefined {
  return existing.find((account) => {
    if (account.platform !== imported.platform) return false;
    if (imported.platform_user_id && account.platform_user_id) {
      return account.platform_user_id === imported.platform_user_id;
    }
    return account.username.toLowerCase() === imported.username.toLowerCase();
  });
}

export function planSocialAccountMerge(
  existingAccounts: SocialAccount[],
  importedAccounts: NormalizedSocialAccountInput[]
): SocialAccountMergePlan {
  const toCreate: NormalizedSocialAccountInput[] = [];
  const toUpdate: SocialAccountUpdatePlan[] = [];

  for (const imported of importedAccounts) {
    const match = findMatch(existingAccounts, imported);
    if (!match) {
      toCreate.push(imported);
      continue;
    }

    const patch: SocialAccountUpdatePlan["patch"] = {};
    const previousValues: SocialAccountUpdatePlan["previousValues"] = {};

    for (const field of PERFORMANCE_FIELDS) {
      const importedValue = imported[field];
      if (importedValue === null || importedValue === undefined) continue;
      const existingValue = match[field];
      if (existingValue !== importedValue) {
        patch[field] = importedValue;
        previousValues[field] = existingValue;
      }
    }

    if (imported.username && imported.username.toLowerCase() !== match.username.toLowerCase()) {
      patch.username = imported.username;
    }
    if (imported.profile_url && imported.profile_url !== match.profile_url) {
      patch.profile_url = imported.profile_url;
    }
    if (imported.platform_user_id && imported.platform_user_id !== match.platform_user_id) {
      patch.platform_user_id = imported.platform_user_id;
    }

    if (Object.keys(patch).length > 0) {
      toUpdate.push({ accountId: match.id, patch, previousValues });
    }
  }

  return { toCreate, toUpdate };
}

export type { SocialPlatform };
