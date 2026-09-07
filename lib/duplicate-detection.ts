import { createClient } from "@/lib/supabase/server";
import type { Creator, SocialPlatform } from "@/types/database";

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

// Bigram (Dice coefficient) string similarity — good enough to flag
// "Maria Perez" vs "Maria Perèz" / "Maria  Perez" without a Postgres
// extension or fetching the whole table client-side. 1 = identical.
function similarity(a: string, b: string): number {
  const bigrams = (s: string) => {
    const norm = s.toLowerCase().trim().replace(/\s+/g, " ");
    const grams = new Set<string>();
    for (let i = 0; i < norm.length - 1; i++) grams.add(norm.slice(i, i + 2));
    return grams;
  };
  const setA = bigrams(a);
  const setB = bigrams(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let overlap = 0;
  for (const g of setA) if (setB.has(g)) overlap++;
  return (2 * overlap) / (setA.size + setB.size);
}

const NAME_SIMILARITY_THRESHOLD = 0.7;

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
