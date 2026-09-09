// Turns one raw spreadsheet row + a confirmed column mapping into
// structured, normalized creator/social-account data (spec: "Normalize
// Data" wizard step). Pure logic, no I/O — the caller decides what to do
// with the result (preview it, match it against existing creators, or
// commit it).
//
// Never invents data: a value that can't be confidently parsed becomes
// null/omitted plus a warning, rather than a guess. Never silently
// discards a column: anything not mapped to a known field is preserved in
// `customFields` unless the mapping explicitly marks it ignored.

import type { CreatorStatus, CreatorType, SocialPlatform } from "@/types/database";
import type { ImportTargetField } from "@/lib/import/column-detection";
import {
  parseFollowerCount,
  parseEngagementRate,
  stripHandle,
  normalizeWhitespace,
  normalizeCategoryList,
  normalizeEmail,
  normalizePhone,
} from "@/lib/normalize";

export interface ColumnMappingEntry {
  header: string;
  field: ImportTargetField | null;
  platform: SocialPlatform | null;
  // Only meaningful when field is null: whether to keep this column's
  // values in creators.custom_fields (default) or discard them entirely.
  // A column is only ever discarded by an explicit choice, never silently.
  includeAsCustomField: boolean;
}

export interface NormalizedSocialAccountInput {
  platform: SocialPlatform;
  username: string;
  profile_url: string | null;
  platform_user_id: string | null;
  followers: number | null;
  following: number | null;
  posts_count: number | null;
  engagement_rate: number | null;
  average_likes: number | null;
  average_comments: number | null;
  average_views: number | null;
  average_shares: number | null;
  average_saves: number | null;
  estimated_reach: number | null;
}

export interface NormalizedCreatorRowInput {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  state_province: string | null;
  gender: string | null;
  languages: string[];
  categories: string[];
  niches: string[];
  creator_type: CreatorType | null;
  status: CreatorStatus | null;
  bio: string | null;
  notes: string | null;
  manager_name: string | null;
  manager_email: string | null;
  agency_name: string | null;
  rate_card_notes: string | null;
  brand_fit_score: number | null;
  internal_rating: number | null;
  tags: string[];
  socialAccounts: NormalizedSocialAccountInput[];
  customFields: Record<string, string>;
}

export interface NormalizeRowResult {
  data: NormalizedCreatorRowInput;
  warnings: string[];
}

const PLATFORM_VALUE_ALIASES: Record<string, SocialPlatform> = {
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

function parsePlatformValue(raw: string | undefined): SocialPlatform | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return PLATFORM_VALUE_ALIASES[key] ?? null;
}

const CREATOR_TYPE_ALIASES: Record<string, CreatorType> = {
  nano: "nano",
  "nano influencer": "nano",
  "nano-influencer": "nano",
  micro: "micro",
  "micro influencer": "micro",
  "micro-influencer": "micro",
  mid: "mid",
  "mid tier": "mid",
  "mid-tier": "mid",
  macro: "macro",
  "macro influencer": "macro",
  "macro-influencer": "macro",
  mega: "mega",
  celebrity: "mega",
  "mega influencer": "mega",
};

const CREATOR_STATUS_ALIASES: Record<string, CreatorStatus> = {
  prospect: "prospect",
  prospecto: "prospect",
  new: "prospect",
  approved: "approved",
  aprobado: "approved",
  active: "active",
  activo: "active",
  inactive: "inactive",
  inactivo: "inactive",
  "do not work with": "do_not_work_with",
  "do_not_work_with": "do_not_work_with",
  blacklisted: "do_not_work_with",
  blocked: "do_not_work_with",
};

function lookupAlias<T extends string>(
  raw: string | undefined,
  aliases: Record<string, T>,
  label: string,
  warnings: string[]
): T | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  const match = aliases[value];
  if (!match) {
    warnings.push(`Unrecognized ${label} value "${raw}" — left blank rather than guessed`);
    return null;
  }
  return match;
}

function numberOrNull(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

// Field keys that belong on a per-platform social account rather than the
// creator record.
type SocialField = Extract<ImportTargetField, `social_${string}`>;

function isSocialField(field: ImportTargetField): field is SocialField {
  return field.startsWith("social_");
}

export function normalizeImportRow(
  raw: Record<string, string>,
  mapping: ColumnMappingEntry[]
): NormalizeRowResult {
  const warnings: string[] = [];

  const declaredPlatform = (() => {
    const platformEntry = mapping.find((m) => m.field === "social_platform");
    if (!platformEntry) return null;
    const parsed = parsePlatformValue(raw[platformEntry.header]);
    if (!parsed && raw[platformEntry.header]?.trim()) {
      warnings.push(`Unrecognized platform value "${raw[platformEntry.header]}"`);
    }
    return parsed;
  })();

  // Bucket every social_* column by platform. A column mapped without a
  // specific platform (no "Instagram"/"TikTok"/... prefix detected) falls
  // back to the row's declared platform (from a "Platform" column), if any.
  const buckets = new Map<string, { platform: SocialPlatform | null; values: Partial<Record<SocialField, string>> }>();
  for (const entry of mapping) {
    if (!entry.field || !isSocialField(entry.field) || entry.field === "social_platform") continue;
    const value = raw[entry.header];
    if (value === undefined || value.trim() === "") continue;

    const platform = entry.platform ?? declaredPlatform;
    const bucketKey = platform ?? "unspecified";
    const bucket = buckets.get(bucketKey) ?? { platform, values: {} };
    bucket.values[entry.field] = value;
    buckets.set(bucketKey, bucket);
  }

  // A generic column with no platform prefix ("Engagement Rate") and no
  // declared-platform column to borrow from lands in the "unspecified"
  // bucket. When the sheet only has one *other*, resolved platform bucket
  // ("Instagram Handle" / "Instagram Followers"), that's almost always the
  // same account the generic column belongs to — a sheet about one
  // platform doesn't usually repeat the platform name on every column.
  // With two or more resolved platforms present, which one it belongs to
  // is genuinely ambiguous, so it's left alone and dropped with a warning
  // below rather than guessed.
  const unspecified = buckets.get("unspecified");
  if (unspecified) {
    const resolvedKeys = [...buckets.keys()].filter((k) => k !== "unspecified");
    if (resolvedKeys.length === 1) {
      const target = buckets.get(resolvedKeys[0])!;
      for (const [field, value] of Object.entries(unspecified.values)) {
        if (!(field in target.values)) target.values[field as SocialField] = value as string;
      }
      buckets.delete("unspecified");
    }
  }

  const socialAccounts: NormalizedSocialAccountInput[] = [];
  for (const [bucketKey, bucket] of buckets) {
    if (!bucket.platform) {
      const fields = Object.keys(bucket.values).join(", ");
      warnings.push(`Could not determine a platform for column(s): ${fields} — not imported`);
      continue;
    }
    const v = bucket.values;
    const username = stripHandle(v.social_username);
    if (!username && !v.social_platform_user_id) {
      // A platform bucket with only follower/engagement numbers and no
      // handle can't be attached to a social account — nothing to key it
      // on, so it's dropped with a warning rather than invented.
      warnings.push(`${bucket.platform}: no username/handle found for column(s) ${Object.keys(v).join(", ")}`);
      continue;
    }

    socialAccounts.push({
      platform: bucket.platform,
      username: username || v.social_platform_user_id!,
      profile_url: v.social_profile_url?.trim() || null,
      platform_user_id: v.social_platform_user_id?.trim() || null,
      followers: parseFollowerCount(v.social_followers),
      following: parseFollowerCount(v.social_following),
      posts_count: parseFollowerCount(v.social_posts_count),
      engagement_rate: parseEngagementRate(v.social_engagement_rate),
      average_likes: parseFollowerCount(v.social_average_likes),
      average_comments: parseFollowerCount(v.social_average_comments),
      average_views: parseFollowerCount(v.social_average_views),
      average_shares: parseFollowerCount(v.social_average_shares),
      average_saves: parseFollowerCount(v.social_average_saves),
      estimated_reach: parseFollowerCount(v.social_estimated_reach),
    });
    void bucketKey;
  }

  const get = (field: ImportTargetField): string | undefined => {
    const entry = mapping.find((m) => m.field === field);
    return entry ? raw[entry.header] : undefined;
  };

  const emailRaw = get("email");
  const email = normalizeEmail(emailRaw);
  if (emailRaw?.trim() && !email) {
    warnings.push(`Invalid email "${emailRaw}" — left blank rather than guessed`);
  }
  const managerEmailRaw = get("manager_email");
  const managerEmail = normalizeEmail(managerEmailRaw);
  if (managerEmailRaw?.trim() && !managerEmail) {
    warnings.push(`Invalid manager email "${managerEmailRaw}" — left blank rather than guessed`);
  }

  const customFields: Record<string, string> = {};
  for (const entry of mapping) {
    if (entry.field !== null || !entry.includeAsCustomField) continue;
    const value = raw[entry.header];
    if (value !== undefined && value.trim() !== "") {
      customFields[entry.header] = value.trim();
    }
  }

  const data: NormalizedCreatorRowInput = {
    first_name: normalizeWhitespace(get("first_name")) || null,
    last_name: normalizeWhitespace(get("last_name")) || null,
    display_name: normalizeWhitespace(get("display_name")) || null,
    email,
    phone: normalizePhone(get("phone")),
    country: normalizeWhitespace(get("country")) || null,
    city: normalizeWhitespace(get("city")) || null,
    state_province: normalizeWhitespace(get("state_province")) || null,
    gender: normalizeWhitespace(get("gender")) || null,
    languages: normalizeCategoryList(get("languages")),
    categories: normalizeCategoryList(get("categories")),
    niches: normalizeCategoryList(get("niches")),
    creator_type: lookupAlias(get("creator_type"), CREATOR_TYPE_ALIASES, "creator type", warnings),
    status: lookupAlias(get("status"), CREATOR_STATUS_ALIASES, "status", warnings),
    bio: normalizeWhitespace(get("bio")) || null,
    notes: normalizeWhitespace(get("notes")) || null,
    manager_name: normalizeWhitespace(get("manager_name")) || null,
    manager_email: managerEmail,
    agency_name: normalizeWhitespace(get("agency_name")) || null,
    rate_card_notes: normalizeWhitespace(get("rate_card_notes")) || null,
    brand_fit_score: numberOrNull(get("brand_fit_score")),
    internal_rating: numberOrNull(get("internal_rating")),
    tags: normalizeCategoryList(get("tags")),
    socialAccounts,
    customFields,
  };

  // display_name is required downstream (creators.display_name is NOT
  // NULL) — derive it from first/last name if the sheet didn't have a
  // dedicated name column, rather than failing the row outright here (the
  // "Review Errors" step is where a still-missing name becomes a hard
  // error the user must resolve).
  if (!data.display_name && (data.first_name || data.last_name)) {
    data.display_name = [data.first_name, data.last_name].filter(Boolean).join(" ");
  }

  return { data, warnings };
}
