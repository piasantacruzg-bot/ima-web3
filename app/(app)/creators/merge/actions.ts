"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { unionArrays } from "@/lib/creator-merge";
import type { Creator } from "@/types/database";

async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: string,
  entityId: string,
  previousValue: Record<string, unknown> | null,
  newValue: Record<string, unknown>
) {
  const { data: userData } = await supabase.auth.getUser();
  await supabase.from("audit_log").insert({
    user_id: userData.user?.id ?? null,
    action,
    entity_type: "creators",
    entity_id: entityId,
    previous_value: previousValue,
    new_value: newValue,
  });
}

// Merges `duplicateId` into `primaryId`: reassigns every child record
// (social accounts, notes, tags, campaign relationships, performance
// snapshots) to the primary creator, applies the user's field-by-field
// choices, unions array fields, and archives the duplicate — never a hard
// delete, so the merge itself stays reversible/inspectable (spec section 17).
export async function mergeCreators(formData: FormData) {
  const primaryId = formData.get("primary_id")?.toString();
  const duplicateId = formData.get("duplicate_id")?.toString();
  if (!primaryId || !duplicateId || primaryId === duplicateId) {
    redirect(`/creators/merge?error=${encodeURIComponent("Invalid merge selection.")}`);
  }

  const supabase = await createClient();
  const [{ data: primary }, { data: duplicate }] = await Promise.all([
    supabase.from("creators").select("*").eq("id", primaryId).maybeSingle(),
    supabase.from("creators").select("*").eq("id", duplicateId).maybeSingle(),
  ]);
  if (!primary || !duplicate) {
    redirect(`/creators/merge?error=${encodeURIComponent("Creator not found.")}`);
  }

  // Field-by-field resolution: a hidden input `field_<key>` set to "a" or
  // "b" for every conflicting field; non-conflicting fields aren't
  // submitted, so default to whichever side has a value.
  const resolved: Record<string, unknown> = {};
  const scalarKeys: (keyof Creator)[] = [
    "display_name",
    "first_name",
    "last_name",
    "email",
    "phone",
    "country",
    "state_province",
    "city",
    "gender",
    "creator_type",
    "status",
    "bio",
    "manager_name",
    "manager_email",
    "agency_name",
    "rate_card_notes",
    "internal_rating",
    "brand_fit_score",
  ];
  for (const key of scalarKeys) {
    const choice = formData.get(`field_${key}`)?.toString();
    if (choice === "b") {
      resolved[key] = (duplicate as Creator)[key];
    } else if (choice === "a") {
      resolved[key] = (primary as Creator)[key];
    } else {
      resolved[key] = (primary as Creator)[key] ?? (duplicate as Creator)[key];
    }
  }
  resolved.languages = unionArrays(primary.languages, duplicate.languages);
  resolved.categories = unionArrays(primary.categories, duplicate.categories);
  resolved.niches = unionArrays(primary.niches, duplicate.niches);

  await supabase.from("creators").update(resolved as Partial<Creator>).eq("id", primaryId);

  // Reassign children. Social accounts and tag assignments can collide on
  // unique constraints (platform+username, creator+tag) if both creators
  // already tracked the same one — skip those rows rather than failing
  // the whole merge.
  const { data: dupAccounts } = await supabase
    .from("social_accounts")
    .select("id")
    .eq("creator_id", duplicateId);
  for (const acc of dupAccounts ?? []) {
    await supabase.from("social_accounts").update({ creator_id: primaryId }).eq("id", acc.id);
  }

  await supabase.from("creator_notes").update({ creator_id: primaryId }).eq("creator_id", duplicateId);

  const { data: dupTags } = await supabase
    .from("creator_tag_assignments")
    .select("id, tag_id")
    .eq("creator_id", duplicateId);
  for (const t of dupTags ?? []) {
    await supabase.from("creator_tag_assignments").update({ creator_id: primaryId }).eq("id", t.id);
  }

  const { data: dupCampaigns } = await supabase
    .from("campaign_creators")
    .select("id, campaign_id")
    .eq("creator_id", duplicateId);
  for (const cc of dupCampaigns ?? []) {
    await supabase.from("campaign_creators").update({ creator_id: primaryId }).eq("id", cc.id);
  }

  await supabase
    .from("creator_performance_snapshots")
    .update({ creator_id: primaryId })
    .eq("creator_id", duplicateId);

  await supabase
    .from("creators")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", duplicateId);

  await logAudit(supabase, "creator_merged", primaryId, { duplicate_id: duplicateId }, resolved);

  revalidatePath("/creators");
  revalidatePath(`/creators/${primaryId}`);
  redirect(`/creators/${primaryId}`);
}
