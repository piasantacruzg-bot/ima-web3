// Regenerates tests/fixtures/Influencers_2025.xlsx, the ~1000-row
// acceptance-test fixture for the Phase 3 importer. Deterministic (fixed
// seed) so re-running it produces byte-identical row data.
//
// Usage: node scripts/generate-fixture.mjs tests/fixtures/Influencers_2025.xlsx

import * as XLSX from "xlsx";

// Deterministic PRNG (mulberry32) so the fixture is reproducible.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function int(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

const FIRST_NAMES = [
  "Maria", "Joao", "Sofia", "Lucas", "Aiko", "Zoe", "Carlos", "Ines", "Diego", "Laura",
  "Mateo", "Valentina", "Noah", "Emma", "Liam", "Olivia", "Yuki", "Haruto", "Amara", "Kofi",
];
const LAST_NAMES = [
  "Perez", "Silva", "Tanaka", "Costa", "Garcia", "Muller", "Dubois", "Rossi", "Kim", "Nguyen",
  "Santos", "Fernandez", "Ivanov", "Andersen", "Okafor",
];
const COUNTRIES = ["Spain", "Brazil", "Japan", "Mexico", "USA", "France", "Germany", "Italy", "South Korea", "Nigeria"];
const CITIES = ["Madrid", "Sao Paulo", "Tokyo", "Guadalajara", "Los Angeles", "Paris", "Berlin", "Milan", "Seoul", "Lagos"];
const CATEGORIES = ["Fashion", "Beauty", "Fitness", "Food", "Travel", "Gaming", "Lifestyle", "Tech", "Music", "Comedy"];
const TIERS = ["Nano", "Micro", "Mid", "Macro", "Mega"];
const STATUSES = ["Prospect", "Approved", "Active", "Inactive"];

const rows = [];
const usedHandles = new Set();

for (let i = 0; i < 1000; i++) {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const name = `${first} ${last}`;
  let handle = `${first}.${last}`.toLowerCase() + (i % 37 === 0 ? "" : String(i));
  // A handful of intentional near-duplicates: same handle reused with a
  // slightly different display name, exercising the duplicate matcher.
  if (i > 0 && i % 97 === 0) {
    const prev = rows[i - 50];
    if (prev) handle = prev["Instagram Handle"];
  }
  usedHandles.add(handle);

  const followers = pick([
    `${int(1, 999)}`,
    `${int(1, 99)}K`,
    `${int(1, 9)}.${int(0, 9)}M`,
    `${int(1000, 999999)}`,
  ]);
  const engagement = pick([`${(rand() * 10).toFixed(1)}%`, `${(rand() * 0.09).toFixed(3)}`, `${(rand() * 10).toFixed(1)}`]);

  // A handful of intentionally bad rows (missing name / bad rating) to
  // exercise "one bad row must not stop the whole import".
  const isBadRow = i % 211 === 0 && i > 0;

  rows.push({
    "Full Name": isBadRow ? "" : name,
    Email: `${handle}@example.com`,
    Phone: `+1${int(2000000000, 9999999999)}`,
    Country: pick(COUNTRIES),
    City: pick(CITIES),
    Category: pick(CATEGORIES),
    "Instagram Handle": handle,
    "Instagram Followers": followers,
    "Engagement Rate": engagement,
    "Creator Type": pick(TIERS),
    Status: pick(STATUSES),
    "Internal Rating": isBadRow ? 12 : int(1, 5),
  });
}

const worksheet = XLSX.utils.json_to_sheet(rows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Influencers");
XLSX.writeFile(workbook, process.argv[2] || "Influencers_2025.xlsx");
console.log(`Wrote ${rows.length} rows`);
