"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { creatorFormSchema } from "@/lib/validation/creator";
import { parseFollowerCount, parseEngagementRate, stripHandle } from "@/lib/normalize";
import { findDuplicateCandidates, type DuplicateCandidate } from "@/lib/duplicate-detection";
import type { Creator, CreatorStatus, SocialPlatform } from "@/types/database";
import type { SocialAccountRow } from "@/components/creators/social-accounts-field";

export interface CreatorFormState {
  error?: string;
}

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return creatorFormSchema.safeParse(raw);
}

function toCreatorRow(values: ReturnType<typeof creatorFormSchema.parse>) {
  return {
    display_name: values.display_name,
    first_name: values.first_name ?? null,
    last_name: values.last_name ?? null,
    email: values.email || null,
    phone: values.phone ?? null,
    country: values.country ?? null,
    city: values.city ?? null,
    state_province: values.state_province ?? null,
    gender: values.gender ?? null,
    profile_image_url: values.profile_image_url || null,
    languages: values.languages ?? [],
    categories: values.categories ?? [],
    niches: values.niches ?? [],
    creator_type: values.creator_type || null,
    status: values.status,
    bio: values.bio ?? null,
    notes: values.notes ?? null,
    manager_name: values.manager_name ?? null,
    manager_email: values.manager_email || null,
    agency_name: values.agency_name ?? null,
    rate_card_notes: values.rate_card_notes ?? null,
    internal_rating: values.internal_rating === "" ? null : values.internal_rating ?? null,
    brand_fit_score: values.brand_fit_score === "" ? null : values.brand_fit_score ?? null,
  };
}

function parseSocialAccountsJson(raw: string | undefined): SocialAccountRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function addSocialAccounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  creatorId: string,
  socialAccountsRaw: string | undefined
): Promise<string[]> {
  const warnings: string[] = [];
  const rows = parseSocialAccountsJson(socialAccountsRaw);

  for (const row of rows) {
    const username = stripHandle(row.username);
    if (!username) continue;

    const { error } = await supabase.from("social_accounts").insert({
      creator_id: creatorId,
      platform: row.platform,
      username,
      profile_url: row.profile_url || null,
      followers: parseFollowerCount(row.followers),
      following: parseFollowerCount(row.following),
      posts_count: parseFollowerCount(row.posts_count),
      engagement_rate: parseEngagementRate(row.engagement_rate),
      average_likes: parseFollowerCount(row.average_likes),
      average_comments: parseFollowerCount(row.average_comments),
      average_views: parseFollowerCount(row.average_views),
      average_shares: parseFollowerCount(row.average_shares),
      average_saves: parseFollowerCount(row.average_saves),
      estimated_reach: parseFollowerCount(row.estimated_reach),
    });

    if (error) {
      // 23505 = unique_violation — this handle is already tracked, which is
      // the duplicate signal from spec section 19/16. Surface it as a
      // warning rather than failing the whole save.
      warnings.push(
        error.code === "23505"
          ? `@${username} on ${row.platform} is already tracked for another creator.`
          : `Failed to add @${username} on ${row.platform}.`
      );
    } else {
      await logAudit(supabase, "social_account_added", creatorId, null, { platform: row.platform, username });
    }
  }
  return warnings;
}

async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: string,
  entityId: string,
  previousValue: Record<string, unknown> | Creator | null,
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

export async function checkCreatorDuplicates(formData: FormData): Promise<DuplicateCandidate[]> {
  const parsed = parseForm(formData);
  if (!parsed.success) return [];

  const excludeCreatorId = formData.get("creator_id")?.toString() || undefined;
  const socialHandles = parseSocialAccountsJson(parsed.data.social_accounts_json)
    .map((r) => ({ platform: r.platform as SocialPlatform, username: stripHandle(r.username) }))
    .filter((r) => r.username);

  return findDuplicateCandidates({
    displayName: parsed.data.display_name,
    email: parsed.data.email || undefined,
    city: parsed.data.city,
    socialHandles,
    excludeCreatorId,
  });
}

export async function createCreator(
  _prevState: CreatorFormState,
  formData: FormData
): Promise<CreatorFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const row = toCreatorRow(parsed.data);

  const { data: creator, error } = await supabase.from("creators").insert(row).select().single();

  if (error || !creator) {
    return { error: "Unable to save creator. Please check the form and try again." };
  }

  const warnings = await addSocialAccounts(supabase, creator.id, parsed.data.social_accounts_json);
  await logAudit(supabase, "creator_created", creator.id, null, row);

  revalidatePath("/creators");
  redirect(
    warnings.length > 0
      ? `/creators/${creator.id}?warnings=${encodeURIComponent(warnings.join("; "))}`
      : `/creators/${creator.id}`
  );
}

export async function updateCreator(
  creatorId: string,
  _prevState: CreatorFormState,
  formData: FormData
): Promise<CreatorFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data: previous } = await supabase
    .from("creators")
    .select("*")
    .eq("id", creatorId)
    .maybeSingle();

  const row = toCreatorRow(parsed.data);
  const { error } = await supabase.from("creators").update(row).eq("id", creatorId);

  if (error) {
    return { error: "Unable to save creator. Please check the form and try again." };
  }

  const warnings = await addSocialAccounts(supabase, creatorId, parsed.data.social_accounts_json);
  await logAudit(supabase, "creator_updated", creatorId, previous ?? null, row);

  revalidatePath("/creators");
  revalidatePath(`/creators/${creatorId}`);
  redirect(
    warnings.length > 0
      ? `/creators/${creatorId}?warnings=${encodeURIComponent(warnings.join("; "))}`
      : `/creators/${creatorId}`
  );
}

// --- Archive / restore (soft delete — spec section 15: never hard-delete
// by default; historical data must survive) ---

export async function archiveCreator(creatorId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("creators")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", creatorId);

  if (!error) {
    await logAudit(supabase, "creator_archived", creatorId, null, {});
  }
  revalidatePath("/creators");
  revalidatePath(`/creators/${creatorId}`);
  redirect(`/creators/${creatorId}`);
}

export async function restoreCreator(creatorId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("creators")
    .update({ archived_at: null })
    .eq("id", creatorId);

  if (!error) {
    await logAudit(supabase, "creator_restored", creatorId, null, {});
  }
  revalidatePath("/creators");
  revalidatePath(`/creators/${creatorId}`);
  redirect(`/creators/${creatorId}`);
}

// Permanent delete stays admin-only (enforced by RLS) and separate from
// archiving — spec section 15: "Only allow permanent deletion for Admin
// users if necessary."
export async function permanentlyDeleteCreator(creatorId: string) {
  const supabase = await createClient();
  const { data: previous } = await supabase
    .from("creators")
    .select("*")
    .eq("id", creatorId)
    .maybeSingle();

  const { error } = await supabase.from("creators").delete().eq("id", creatorId);
  if (error) {
    redirect(`/creators/${creatorId}/edit?error=${encodeURIComponent("Unable to delete creator.")}`);
  }

  await logAudit(supabase, "creator_deleted", creatorId, previous ?? null, {});
  revalidatePath("/creators");
  redirect("/creators");
}

export async function checkExistingCreatorDuplicates(
  creatorId: string
): Promise<DuplicateCandidate[]> {
  const supabase = await createClient();
  const [{ data: creator }, { data: accounts }] = await Promise.all([
    supabase.from("creators").select("*").eq("id", creatorId).maybeSingle(),
    supabase.from("social_accounts").select("platform, username").eq("creator_id", creatorId),
  ]);
  if (!creator) return [];

  return findDuplicateCandidates({
    displayName: creator.display_name,
    email: creator.email ?? undefined,
    city: creator.city ?? undefined,
    socialHandles: (accounts ?? []).map((a) => ({
      platform: a.platform as SocialPlatform,
      username: a.username,
    })),
    excludeCreatorId: creatorId,
  });
}

export async function changeCreatorStatus(creatorId: string, formData: FormData) {
  const status = formData.get("status") as CreatorStatus;
  const supabase = await createClient();
  const { data: previous } = await supabase
    .from("creators")
    .select("status")
    .eq("id", creatorId)
    .maybeSingle();

  const { error } = await supabase.from("creators").update({ status }).eq("id", creatorId);
  if (!error) {
    await logAudit(supabase, "status_changed", creatorId, previous, { status });
  }
  revalidatePath("/creators");
  revalidatePath(`/creators/${creatorId}`);
}

// --- Notes ---

export async function addCreatorNote(creatorId: string, formData: FormData) {
  const body = formData.get("body")?.toString().trim();
  if (!body) return;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  await supabase
    .from("creator_notes")
    .insert({ creator_id: creatorId, body, author_id: userData.user?.id ?? null });

  await logAudit(supabase, "note_added", creatorId, null, { body });
  revalidatePath(`/creators/${creatorId}`);
}

export async function deleteCreatorNote(noteId: string, creatorId: string) {
  const supabase = await createClient();
  await supabase.from("creator_notes").delete().eq("id", noteId);
  revalidatePath(`/creators/${creatorId}`);
}

// --- Tags ---

export async function createAndAssignTag(creatorId: string, formData: FormData) {
  const name = formData.get("tag_name")?.toString().trim();
  if (!name) return;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  let { data: tag } = await supabase
    .from("creator_tags")
    .select("*")
    .ilike("name", name)
    .maybeSingle();

  if (!tag) {
    const { data: created, error } = await supabase
      .from("creator_tags")
      .insert({ name, created_by: userData.user?.id ?? null })
      .select()
      .single();
    if (error || !created) return;
    tag = created;
  }

  await supabase
    .from("creator_tag_assignments")
    .insert({ creator_id: creatorId, tag_id: tag.id, assigned_by: userData.user?.id ?? null })
    .select()
    .maybeSingle();

  await logAudit(supabase, "tag_added", creatorId, null, { tag: name });
  revalidatePath(`/creators/${creatorId}`);
}

// --- Bulk actions ---

export async function bulkChangeStatus(ids: string[], status: CreatorStatus) {
  if (ids.length === 0) return;
  const supabase = await createClient();
  await supabase.from("creators").update({ status }).in("id", ids);
  for (const id of ids) await logAudit(supabase, "status_changed", id, null, { status });
  revalidatePath("/creators");
}

export async function bulkArchive(ids: string[]) {
  if (ids.length === 0) return;
  const supabase = await createClient();
  await supabase.from("creators").update({ archived_at: new Date().toISOString() }).in("id", ids);
  for (const id of ids) await logAudit(supabase, "creator_archived", id, null, {});
  revalidatePath("/creators");
}

export async function bulkAddTag(ids: string[], tagName: string) {
  if (ids.length === 0 || !tagName.trim()) return;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  let { data: tag } = await supabase
    .from("creator_tags")
    .select("*")
    .ilike("name", tagName.trim())
    .maybeSingle();
  if (!tag) {
    const { data: created } = await supabase
      .from("creator_tags")
      .insert({ name: tagName.trim(), created_by: userData.user?.id ?? null })
      .select()
      .single();
    tag = created;
  }
  if (!tag) return;

  const rows = ids.map((creator_id) => ({
    creator_id,
    tag_id: tag!.id,
    assigned_by: userData.user?.id ?? null,
  }));
  await supabase.from("creator_tag_assignments").upsert(rows, { onConflict: "creator_id,tag_id" });
  for (const id of ids) await logAudit(supabase, "tag_added", id, null, { tag: tagName });
  revalidatePath("/creators");
}

export async function bulkAddCategory(ids: string[], category: string) {
  if (ids.length === 0 || !category.trim()) return;
  const supabase = await createClient();
  const { data: rows } = await supabase.from("creators").select("id, categories").in("id", ids);
  for (const row of rows ?? []) {
    if (!row.categories.includes(category.trim())) {
      await supabase
        .from("creators")
        .update({ categories: [...row.categories, category.trim()] })
        .eq("id", row.id);
    }
  }
  revalidatePath("/creators");
}

// --- Saved filters ---

export async function saveCreatorFilter(formData: FormData) {
  const name = formData.get("name")?.toString().trim();
  const config = formData.get("config")?.toString();
  if (!name || !config) return;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  await supabase.from("saved_creator_filters").insert({
    name,
    user_id: userData.user.id,
    filter_config: JSON.parse(config),
  });
  revalidatePath("/creators");
}

export async function deleteSavedFilter(filterId: string) {
  const supabase = await createClient();
  await supabase.from("saved_creator_filters").delete().eq("id", filterId);
  revalidatePath("/creators");
}

export async function renameSavedFilter(filterId: string, formData: FormData) {
  const name = formData.get("name")?.toString().trim();
  if (!name) return;
  const supabase = await createClient();
  await supabase.from("saved_creator_filters").update({ name }).eq("id", filterId);
  revalidatePath("/creators");
}

export async function removeTagAssignment(creatorId: string, tagId: string) {
  const supabase = await createClient();
  await supabase
    .from("creator_tag_assignments")
    .delete()
    .eq("creator_id", creatorId)
    .eq("tag_id", tagId);

  await logAudit(supabase, "tag_removed", creatorId, null, { tag_id: tagId });
  revalidatePath(`/creators/${creatorId}`);
}
