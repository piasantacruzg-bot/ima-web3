// Batch-processing scale test (spec: "batch processing tested at 10,000+
// rows"). Builds a synthetic existing-creator pool and a synthetic set of
// import rows, then matches every row against the pool. Correctness (not
// timing) is the main assertion — the generous timing check only guards
// against an accidental O(n²) regression, not CI noise.

import { describe, it, expect } from "vitest";
import { buildCreatorMatchIndex, matchImportRow, type ExistingCreatorForMatching } from "@/lib/import/match-creator";

function buildPool(size: number): ExistingCreatorForMatching[] {
  const pool: ExistingCreatorForMatching[] = [];
  for (let i = 0; i < size; i++) {
    pool.push({
      id: `creator-${i}`,
      display_name: `Creator Name ${i}`,
      email: `creator${i}@example.com`,
      phone: `+1555000${String(i).padStart(4, "0")}`,
      city: i % 5 === 0 ? "Madrid" : "Other City",
      country: "Spain",
      categories: ["Fashion"],
      socialAccounts: [{ platform: "instagram", username: `handle${i}`, platform_user_id: `IG${i}` }],
    });
  }
  return pool;
}

describe("matchImportRow at scale", () => {
  it("matches 10,000 rows against a 5,000-creator pool correctly and in reasonable time", () => {
    const pool = buildPool(5_000);
    const index = buildCreatorMatchIndex(pool);

    let exactMatches = 0;
    let noMatches = 0;

    const start = Date.now();
    for (let i = 0; i < 10_000; i++) {
      // Half the rows exactly match an existing creator (by platform_user_id
      // — the highest-confidence signal); the other half are brand new.
      const isExisting = i % 2 === 0;
      const targetIndex = i % pool.length;
      const row = isExisting
        ? {
            displayName: `Creator Name ${targetIndex}`,
            socialAccounts: [{ platform: "instagram" as const, username: `handle${targetIndex}`, platform_user_id: `IG${targetIndex}` }],
          }
        : {
            displayName: `Brand New Creator ${i}`,
            socialAccounts: [{ platform: "tiktok" as const, username: `newhandle${i}` }],
          };

      const matches = matchImportRow(row, index);
      if (isExisting) {
        expect(matches[0]?.confidence).toBe("exact");
        exactMatches++;
      } else {
        expect(matches).toHaveLength(0);
        noMatches++;
      }
    }
    const durationMs = Date.now() - start;

    expect(exactMatches).toBe(5_000);
    expect(noMatches).toBe(5_000);
    // Generous ceiling — this is a correctness regression guard, not a
    // performance benchmark.
    expect(durationMs).toBeLessThan(15_000);
  });
});
