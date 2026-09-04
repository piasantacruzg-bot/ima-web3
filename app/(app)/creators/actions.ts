"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { creatorFormSchema } from "@/lib/validation/creator";
import { parseSocialProfileUrl } from "@/lib/social/parse-url";
import type { Creator } from "@/types/database";

export interface CreatorFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
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
    gender: values.gender ?? null,
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

async function addSocialAccounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  creatorId: string,
  socialUrlsRaw: string | undefined
): Promise<string[]> {
  const warnings: string[] = [];
  const lines = (socialUrlsRaw ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const parsed = parseSocialProfileUrl(line);
    if (!parsed) {
      warnings.push(`Could not identify platform for: ${line}`);
      continue;
    }
    const { error } = await supabase.from("social_accounts").insert({
      creator_id: creatorId,
      platform: parsed.platform,
      username: parsed.username,
      profile_url: parsed.profileUrl,
    });
    if (error) {
      // 23505 = unique_violation — this handle is already tracked (possibly
      // for another creator), which is exactly the duplicate signal from
      // spec section 19. Surface it rather than failing the whole save.
      if (error.code === "23505") {
        warnings.push(`@${parsed.username} on ${parsed.platform} is already tracked for another creator.`);
      } else {
        warnings.push(`Failed to add @${parsed.username} on ${parsed.platform}: ${error.message}`);
      }
    }
  }
  return warnings;
}

async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: string,
  entityId: string,
  previousValue: Creator | null,
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

  const { data: creator, error } = await supabase
    .from("creators")
    .insert(row)
    .select()
    .single();

  if (error || !creator) {
    return { error: error?.message ?? "Failed to create creator." };
  }

  const warnings = await addSocialAccounts(supabase, creator.id, parsed.data.social_urls);
  await logAudit(supabase, "creator_created", creator.id, null, row);

  revalidatePath("/creators");
  if (warnings.length > 0) {
    // Still redirect — the creator was saved. Warnings about unparsed/
    // duplicate social URLs surface on the profile page via a query param
    // rather than blocking the save.
    redirect(`/creators/${creator.id}?warnings=${encodeURIComponent(warnings.join("; "))}`);
  }
  redirect(`/creators/${creator.id}`);
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
    return { error: error.message };
  }

  const warnings = await addSocialAccounts(supabase, creatorId, parsed.data.social_urls);
  await logAudit(supabase, "creator_updated", creatorId, previous ?? null, row);

  revalidatePath("/creators");
  revalidatePath(`/creators/${creatorId}`);
  if (warnings.length > 0) {
    redirect(`/creators/${creatorId}?warnings=${encodeURIComponent(warnings.join("; "))}`);
  }
  redirect(`/creators/${creatorId}`);
}

export async function deleteCreator(creatorId: string) {
  const supabase = await createClient();
  const { data: previous } = await supabase
    .from("creators")
    .select("*")
    .eq("id", creatorId)
    .maybeSingle();

  const { error } = await supabase.from("creators").delete().eq("id", creatorId);
  if (error) {
    redirect(`/creators/${creatorId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  await logAudit(supabase, "creator_deleted", creatorId, previous ?? null, {});
  revalidatePath("/creators");
  redirect("/creators");
}
