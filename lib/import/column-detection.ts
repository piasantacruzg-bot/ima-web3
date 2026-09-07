// Column detection for the CSV/XLSX importer (Phase 3). Suggests a mapping
// from a spreadsheet's header row to Creator Campaign OS fields — it never
// applies a mapping on its own. The "Map Columns" wizard step shows these
// suggestions and always lets the user confirm, override, or leave a column
// unmapped (kept as a candidate custom field — see spec principle "never
// discard unknown columns without approval").

import type { SocialPlatform } from "@/types/database";

export type ImportTargetField =
  | "first_name"
  | "last_name"
  | "display_name"
  | "email"
  | "phone"
  | "country"
  | "city"
  | "state_province"
  | "gender"
  | "languages"
  | "categories"
  | "niches"
  | "creator_type"
  | "status"
  | "bio"
  | "notes"
  | "manager_name"
  | "manager_email"
  | "agency_name"
  | "rate_card_notes"
  | "brand_fit_score"
  | "internal_rating"
  | "tags"
  | "social_platform"
  | "social_username"
  | "social_profile_url"
  | "social_platform_user_id"
  | "social_followers"
  | "social_following"
  | "social_posts_count"
  | "social_engagement_rate"
  | "social_average_likes"
  | "social_average_comments"
  | "social_average_views"
  | "social_average_shares"
  | "social_average_saves"
  | "social_estimated_reach";

// Fields that describe a social account rather than the creator record
// itself — a header detected as one of these also gets an (optional)
// per-column platform guess, since a sheet often has one column per
// platform ("Instagram Followers", "TikTok Followers", ...).
export const SOCIAL_TARGET_FIELDS: ReadonlySet<ImportTargetField> = new Set([
  "social_platform",
  "social_username",
  "social_profile_url",
  "social_platform_user_id",
  "social_followers",
  "social_following",
  "social_posts_count",
  "social_engagement_rate",
  "social_average_likes",
  "social_average_comments",
  "social_average_views",
  "social_average_shares",
  "social_average_saves",
  "social_estimated_reach",
]);

export type DetectionConfidence = "high" | "medium" | "none";

export interface ColumnDetectionResult {
  header: string;
  normalizedHeader: string;
  field: ImportTargetField | null;
  platform: SocialPlatform | null;
  confidence: DetectionConfidence;
  matchedAlias: string | null;
}

function normalize(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[_\-/]+/g, " ")
    .replace(/[^\w\s%]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Longer/more specific aliases are listed first within each field so a
// partial-match scan prefers "engagement rate" over a looser "rate".
const FIELD_ALIASES: Record<ImportTargetField, string[]> = {
  display_name: ["full name", "creator name", "influencer name", "contact name", "name"],
  first_name: ["first name", "firstname", "given name"],
  last_name: ["last name", "lastname", "surname", "family name"],
  email: ["email address", "contact email", "e mail", "email"],
  phone: [
    "whatsapp number",
    "phone number",
    "contact number",
    "mobile number",
    "whatsapp",
    "mobile",
    "cell",
    "phone",
  ],
  country: ["country name", "country"],
  city: ["city", "town"],
  state_province: ["state province", "state", "province", "region"],
  gender: ["gender", "sex"],
  languages: ["spoken language", "languages", "language"],
  categories: ["content category", "categories", "category", "vertical", "verticals", "niche category"],
  niches: ["sub niche", "subniche", "niches", "niche"],
  creator_type: ["creator type", "influencer tier", "creator size", "creator tier", "tier", "size"],
  status: ["creator status", "status", "stage"],
  bio: ["biography", "about", "description", "bio"],
  notes: ["internal notes", "comments", "remarks", "notes"],
  manager_name: ["talent manager", "manager name", "agent name", "manager", "agent"],
  manager_email: ["manager email", "agent email"],
  agency_name: ["management agency", "agency name", "agency"],
  rate_card_notes: ["rate card", "pricing", "rates", "fee", "fees", "price", "rate"],
  brand_fit_score: ["brand fit score", "brand fit", "fit score"],
  internal_rating: ["internal rating", "rating", "score"],
  tags: ["tags", "labels", "tag"],
  social_platform: ["social platform", "platform", "network"],
  social_username: [
    "profile handle",
    "instagram username",
    "instagram handle",
    "tiktok username",
    "tiktok handle",
    "channel name",
    "user name",
    "username",
    "handle",
    "channel",
  ],
  social_profile_url: [
    "channel url",
    "profile url",
    "profile link",
    "page url",
    "social url",
    "link",
    "url",
  ],
  social_platform_user_id: ["platform user id", "account id", "channel id", "user id"],
  social_followers: [
    "follower count",
    "subscriber count",
    "followers",
    "subscribers",
    "fans",
  ],
  social_following: ["following", "follows"],
  social_posts_count: ["number of posts", "post count", "video count", "posts", "videos"],
  social_engagement_rate: ["engagement rate", "eng rate", "engagement", "er"],
  social_average_likes: ["average likes", "avg likes", "likes"],
  social_average_comments: ["average comments", "avg comments", "comments"],
  social_average_views: ["average views", "avg views", "views"],
  social_average_shares: ["average shares", "avg shares", "shares"],
  social_average_saves: ["average saves", "avg saves", "saves"],
  social_estimated_reach: ["estimated reach", "avg reach", "reach"],
};

// Built once: normalized alias -> field, for O(1) exact-match lookups.
const EXACT_ALIAS_MAP = new Map<string, ImportTargetField>();
for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [ImportTargetField, string[]][]) {
  for (const alias of aliases) {
    EXACT_ALIAS_MAP.set(alias, field);
  }
}

// Ordered longest-alias-first so partial matching prefers the most specific
// phrase (e.g. "engagement rate" wins over a coincidental "rate" match).
const ALIASES_BY_LENGTH: { alias: string; field: ImportTargetField }[] = Object.entries(
  FIELD_ALIASES
)
  .flatMap(([field, aliases]) => aliases.map((alias) => ({ alias, field: field as ImportTargetField })))
  .sort((a, b) => b.alias.length - a.alias.length);

// Platform keyword -> platform. Matched as a whole token against the
// normalized header's words, never as a substring, so a header like "Bio"
// doesn't accidentally match a stray platform keyword.
const PLATFORM_TOKENS: Record<string, SocialPlatform> = {
  instagram: "instagram",
  ig: "instagram",
  tiktok: "tiktok",
  tt: "tiktok",
  youtube: "youtube",
  yt: "youtube",
  facebook: "facebook",
  fb: "facebook",
  twitter: "x",
  x: "x",
};

// Whole-word matching for the partial-match fallback — a raw substring
// check would let a short alias like "er" (engagement rate) false-match
// inside an unrelated word like "internal". Both sides are already
// normalized (lowercase, single-spaced), so this checks whether the
// alias's words appear as a contiguous run of *whole* words in the
// candidate, not merely as characters.
function containsWordSequence(candidateWords: string[], aliasWords: string[]): boolean {
  if (aliasWords.length > candidateWords.length) return false;
  for (let i = 0; i <= candidateWords.length - aliasWords.length; i++) {
    let matches = true;
    for (let j = 0; j < aliasWords.length; j++) {
      if (candidateWords[i + j] !== aliasWords[j]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

function detectPlatform(normalizedHeader: string): { platform: SocialPlatform | null; remainder: string } {
  const words = normalizedHeader.split(" ");
  for (let i = 0; i < words.length; i++) {
    const platform = PLATFORM_TOKENS[words[i]];
    if (platform) {
      const remainder = [...words.slice(0, i), ...words.slice(i + 1)].join(" ").trim();
      return { platform, remainder };
    }
  }
  return { platform: null, remainder: normalizedHeader };
}

// Suggests a target field (and, for social-account fields, a platform) for
// a single header. Never mutates or discards anything — the caller decides
// what to do with a `field: null` ("none") result.
export function detectColumn(header: string): ColumnDetectionResult {
  const normalizedHeader = normalize(header);
  const { platform, remainder } = detectPlatform(normalizedHeader);

  // Try the platform-stripped remainder first (e.g. "instagram followers"
  // -> "followers"), then fall back to the full header, so a platform
  // token never prevents an otherwise-good match.
  const candidates = remainder && remainder !== normalizedHeader ? [remainder, normalizedHeader] : [normalizedHeader];

  for (const candidate of candidates) {
    const exact = EXACT_ALIAS_MAP.get(candidate);
    if (exact) {
      return {
        header,
        normalizedHeader,
        field: exact,
        platform: SOCIAL_TARGET_FIELDS.has(exact) ? platform : null,
        confidence: "high",
        matchedAlias: candidate,
      };
    }
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    const candidateWords = candidate.split(" ");
    for (const { alias, field } of ALIASES_BY_LENGTH) {
      if (containsWordSequence(candidateWords, alias.split(" "))) {
        return {
          header,
          normalizedHeader,
          field,
          platform: SOCIAL_TARGET_FIELDS.has(field) ? platform : null,
          confidence: "medium",
          matchedAlias: alias,
        };
      }
    }
  }

  return {
    header,
    normalizedHeader,
    field: null,
    platform,
    confidence: "none",
    matchedAlias: null,
  };
}

export function detectColumns(headers: string[]): ColumnDetectionResult[] {
  return headers.map(detectColumn);
}

// Human-readable labels for the "Map Columns" step's target-field picker.
export const TARGET_FIELD_LABELS: Record<ImportTargetField, string> = {
  first_name: "First name",
  last_name: "Last name",
  display_name: "Display name",
  email: "Email",
  phone: "Phone",
  country: "Country",
  city: "City",
  state_province: "State / Province",
  gender: "Gender",
  languages: "Languages",
  categories: "Categories",
  niches: "Niches",
  creator_type: "Creator type",
  status: "Status",
  bio: "Bio",
  notes: "Notes",
  manager_name: "Manager name",
  manager_email: "Manager email",
  agency_name: "Agency name",
  rate_card_notes: "Rate card notes",
  brand_fit_score: "Brand fit score",
  internal_rating: "Internal rating",
  tags: "Tags",
  social_platform: "Social platform",
  social_username: "Social username / handle",
  social_profile_url: "Social profile URL",
  social_platform_user_id: "Social platform account ID",
  social_followers: "Followers",
  social_following: "Following",
  social_posts_count: "Post count",
  social_engagement_rate: "Engagement rate",
  social_average_likes: "Average likes",
  social_average_comments: "Average comments",
  social_average_views: "Average views",
  social_average_shares: "Average shares",
  social_average_saves: "Average saves",
  social_estimated_reach: "Estimated reach",
};

export const SOCIAL_PLATFORMS: { value: import("@/types/database").SocialPlatform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "x", label: "X / Twitter" },
  { value: "other", label: "Other" },
];
