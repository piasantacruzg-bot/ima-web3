// Shared string similarity for duplicate detection, used by both the manual
// "check while typing" flow (lib/duplicate-detection.ts) and the import
// matching engine (lib/import/match-creator.ts) so "similar name" means the
// same thing in both places.

// Bigram (Dice coefficient) string similarity — good enough to flag
// "Maria Perez" vs "Maria Perèz" / "Maria  Perez" without a Postgres
// extension or fetching the whole table client-side. 1 = identical.
export function similarity(a: string, b: string): number {
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

export const NAME_SIMILARITY_THRESHOLD = 0.7;
