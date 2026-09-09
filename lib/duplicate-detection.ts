import { createClient } from "@/lib/supabase/server";
import type { Creator, SocialPlatform } from "@/types/database";
import { similarity, NAME_SIMILARITY_THRESHOLD } from "@/lib/string-similarity";

export interface DuplicateCandidate {
  creator: Creator;
  matchType: "exact" | "potential";
  reasons: string[];
}

export interface DuplicateCheckInput {
  displayName?: string;
  email?: string;
  city?: string;
  socialHandles?: { platform: SocialPlatform; username: string }[];
  excludeCreatorId?: string;
}

export async function findDuplicateCandidates(
  input: DuplicateCheckInput
): Promise<DuplicateCandidate[]> {
  const supabase = await createClient();
  const candidates = new Map<string, DuplicateCandidate>();

  function addReason(creator: Creator, matchType: "exact" | "potential", reason: string) {
    const existing = candidates.get(creator.id);
    if (existing) {
      existing.reasons.push(reason);
      if (matchType === "exact") existing.matchType = "exact";
    } else {
      candidates.set(creator.id, { creator, matchType, reasons: [reason] });
    }
  }

  // Exact: social handle already tracked for another creator.
  for (const handle of input.socialHandles ?? []) {
    const { data } = await supabase
      .from("social_accounts")
      .select("creator_id, username, creators(*)")
      .eq("platform", handle.platform)
      .ilike("username", handle.username);

    for (const row of data ?? []) {
      const creator = (row as unknown as { creators: Creator | null }).creators;
      if (creator && creator.id !== input.excludeCreatorId) {
        addReason(creator, "exact", `${handle.platform} handle @${handle.username} already exists`);
      }
    }
  }

  // Exact: same email.
  if (input.email) {
    const { data } = await supabase
      .from("creators")
      .select("*")
      .ilike("email", input.email)
      .is("archived_at", null);

    for (const creator of data ?? []) {
      if (creator.id !== input.excludeCreatorId) {
        addReason(creator, "exact", `Same email (${input.email})`);
      }
    }
  }

  // Potential: similar display name (optionally narrowed by same city).
  if (input.displayName) {
    const { data } = await supabase
      .from("creators")
      .select("*")
      .is("archived_at", null)
      .neq("id", input.excludeCreatorId ?? "00000000-0000-0000-0000-000000000000");

    for (const creator of data ?? []) {
      const score = similarity(creator.display_name, input.displayName);
      if (score >= NAME_SIMILARITY_THRESHOLD) {
        const sameCity =
          input.city && creator.city && creator.city.toLowerCase() === input.city.toLowerCase();
        addReason(
          creator,
          "potential",
          sameCity
            ? `Similar name "${creator.display_name}" in the same city`
            : `Similar name "${creator.display_name}"`
        );
      }
    }
  }

  return [...candidates.values()].sort((a, b) => (a.matchType === "exact" ? -1 : 1));
}
