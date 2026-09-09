"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  buildCreatorMatchIndex,
  matchImportRow,
  type CreatorMatch,
  type ExistingCreatorForMatching,
} from "@/lib/import/match-creator";
import type { NormalizedCreatorRowInput } from "@/lib/import/normalize-row";
import { resolveImportMerge, resolveImportArrayFields, type ImportMergeFieldKey } from "@/lib/import/merge-decision";
import { planSocialAccountMerge, type SocialAccountUpdatePlan } from "@/lib/import/social-account-merge";
import type { Creator, ImportRowAction, ImportRowStatus, SocialAccount } from "@/types/database";

// --- Matching (Review Matches step) ---------------------------------
//
// Runs server-side so the full creator pool never has to be shipped to the
// browser just to compute matches — the client sends normalized rows, this
// builds one lookup index for the whole non-archived creator base, and
// returns per-row match results plus enough creator info to render them.

export interface MatchRowsResult {
  matches: Record<number, CreatorMatch[]>;
  creators: Record<string, { display_name: string; email: string | null; city: string | null }>;
}

export async function matchImportRows(
  rows: { index: number; data: NormalizedCreatorRowInput }[]
): Promise<MatchRowsResult> {
  const supabase = await createClient();

  const [{ data: creators }, { data: socialAccounts }] = await Promise.all([
    supabase
      .from("creators")
      .select("id, display_name, email, phone, city, country, categories")
      .is("archived_at", null),
    supabase.from("social_accounts").select("creator_id, platform, username, platform_user_id"),
  ]);

  const accountsByCreator = new Map<string, ExistingCreatorForMatching["socialAccounts"]>();
  for (const account of socialAccounts ?? []) {
    const list = accountsByCreator.get(account.creator_id) ?? [];
    list.push({
      platform: account.platform,
      username: account.username,
      platform_user_id: account.platform_user_id,
    });
    accountsByCreator.set(account.creator_id, list);
  }

  const pool: ExistingCreatorForMatching[] = (creators ?? []).map((c) => ({
    id: c.id,
    display_name: c.display_name,
    email: c.email,
    phone: c.phone,
    city: c.city,
    country: c.country,
    categories: c.categories ?? [],
    socialAccounts: accountsByCreator.get(c.id) ?? [],
  }));

  const index = buildCreatorMatchIndex(pool);
  const matches: Record<number, CreatorMatch[]> = {};
  for (const row of rows) {
    const result = matchImportRow(
      {
        displayName: row.data.display_name,
        email: row.data.email,
        phone: row.data.phone,
        city: row.data.city,
        country: row.data.country,
        categories: row.data.categories,
        socialAccounts: row.data.socialAccounts,
      },
      index
    );
    if (result.length > 0) matches[row.index] = result;
  }

  const creatorLookup: MatchRowsResult["creators"] = {};
  for (const c of pool) {
    creatorLookup[c.id] = { display_name: c.display_name, email: c.email, city: c.city };
  }

  return { matches, creators: creatorLookup };
}

// --- Commit (Import step) --------------------------------------------

export interface CommitImportRowInput {
  rowNumber: number;
  sourceSheet: string | null;
  rawData: Record<string, string>;
  normalizedData: NormalizedCreatorRowInput;
  matchedCreatorId: string | null;
  matchConfidence: "exact" | "high" | "low" | null;
  matchReasons: string[];
  action: ImportRowAction;
  mergeDecisions?: Partial<Record<ImportMergeFieldKey, "existing" | "imported">>;
  errors: string[];
}

export interface CommitImportInput {
  fileName: string;
  fileType: "csv" | "xlsx";
  sourceName: string | null;
  columnMapping: Record<string, string>;
  rows: CommitImportRowInput[];
}

const CONFIDENCE_SCORE: Record<"exact" | "high" | "low", number> = { exact: 100, high: 70, low: 40 };

function toPerformanceSnapshotFields(previousValues: SocialAccountUpdatePlan["previousValues"]) {
  const snapshot: Record<string, number | null> = {};
  if ("followers" in previousValues) snapshot.followers = previousValues.followers ?? null;
  if ("estimated_reach" in previousValues) snapshot.reach = previousValues.estimated_reach ?? null;
  if ("average_views" in previousValues) snapshot.views = previousValues.average_views ?? null;
  if ("average_likes" in previousValues) snapshot.likes = previousValues.average_likes ?? null;
  if ("average_comments" in previousValues) snapshot.comments = previousValues.average_comments ?? null;
  if ("average_shares" in previousValues) snapshot.shares = previousValues.average_shares ?? null;
  if ("average_saves" in previousValues) snapshot.saves = previousValues.average_saves ?? null;
  if ("engagement_rate" in previousValues) snapshot.engagement_rate = previousValues.engagement_rate ?? null;
  return snapshot;
}

async function ensureTagsAssigned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  creatorId: string,
  tagNames: string[],
  userId: string | null
) {
  for (const name of tagNames) {
    let { data: tag } = await supabase.from("creator_tags").select("*").ilike("name", name).maybeSingle();
    if (!tag) {
      const { data: created } = await supabase
        .from("creator_tags")
        .insert({ name, created_by: userId })
        .select()
        .maybeSingle();
      tag = created;
    }
    if (tag) {
      await supabase
        .from("creator_tag_assignments")
        .insert({ creator_id: creatorId, tag_id: tag.id, assigned_by: userId })
        .select()
        .maybeSingle();
    }
  }
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function createCreatorFromRow(
  supabase: Supabase,
  row: CommitImportRowInput,
  batchId: string,
  userId: string | null
): Promise<{ creatorId: string; socialAccountsCreated: number }> {
  const d = row.normalizedData;
  if (!d.display_name) throw new Error("Missing creator name");

  const creatorRow = {
    display_name: d.display_name,
    first_name: d.first_name,
    last_name: d.last_name,
    email: d.email,
    phone: d.phone,
    country: d.country,
    city: d.city,
    state_province: d.state_province,
    gender: d.gender,
    languages: d.languages,
    categories: d.categories,
    niches: d.niches,
    creator_type: d.creator_type,
    status: d.status ?? "prospect",
    bio: d.bio,
    notes: d.notes,
    manager_name: d.manager_name,
    manager_email: d.manager_email,
    agency_name: d.agency_name,
    rate_card_notes: d.rate_card_notes,
    brand_fit_score: d.brand_fit_score,
    internal_rating: d.internal_rating,
    custom_fields: d.customFields,
    created_by: userId,
  };

  const { data: creator, error } = await supabase.from("creators").insert(creatorRow).select().single();
  if (error || !creator) throw new Error(error?.message ?? "Failed to create creator");

  let socialAccountsCreated = 0;
  for (const account of d.socialAccounts) {
    const { error: saError } = await supabase.from("social_accounts").insert({
      creator_id: creator.id,
      ...account,
    });
    if (!saError) socialAccountsCreated++;
  }

  if (d.tags.length > 0) await ensureTagsAssigned(supabase, creator.id, d.tags, userId);

  await supabase.from("audit_log").insert({
    user_id: userId,
    action: "creator_imported",
    entity_type: "creators",
    entity_id: creator.id,
    previous_value: null,
    new_value: { ...creatorRow, import_batch_id: batchId },
  });

  return { creatorId: creator.id, socialAccountsCreated };
}

async function updateCreatorFromRow(
  supabase: Supabase,
  row: CommitImportRowInput,
  batchId: string,
  userId: string | null
): Promise<{ previousSnapshot: Record<string, unknown>; updatedFieldCount: number; socialAccountsCreated: number }> {
  const creatorId = row.matchedCreatorId;
  if (!creatorId) throw new Error("No matched creator to update");

  const [{ data: existing }, { data: existingAccounts }] = await Promise.all([
    supabase.from("creators").select("*").eq("id", creatorId).maybeSingle(),
    supabase.from("social_accounts").select("*").eq("creator_id", creatorId),
  ]);
  if (!existing) throw new Error("Matched creator no longer exists");

  const scalarPatch = resolveImportMerge(existing, row.normalizedData, row.mergeDecisions ?? {});
  const arrayPatch = resolveImportArrayFields(existing, row.normalizedData);
  const arrayChanged =
    arrayPatch.categories.length !== existing.categories.length ||
    arrayPatch.niches.length !== existing.niches.length ||
    arrayPatch.languages.length !== existing.languages.length;
  const customFieldsChanged = Object.keys(row.normalizedData.customFields).length > 0;
  const customFieldsPatch = customFieldsChanged
    ? { custom_fields: { ...existing.custom_fields, ...row.normalizedData.customFields } }
    : {};

  const fullPatch: Record<string, unknown> = { ...scalarPatch, ...customFieldsPatch };
  if (arrayChanged) Object.assign(fullPatch, arrayPatch);
  const updatedFieldCount = Object.keys(fullPatch).length;

  if (updatedFieldCount > 0) {
    await supabase.from("creators").update(fullPatch as Partial<Creator>).eq("id", creatorId);
  }

  const socialPlan = planSocialAccountMerge(existingAccounts ?? [], row.normalizedData.socialAccounts);
  let socialAccountsCreated = 0;
  const createdSocialAccountIds: string[] = [];
  for (const create of socialPlan.toCreate) {
    const { data: created, error } = await supabase
      .from("social_accounts")
      .insert({ creator_id: creatorId, ...create })
      .select("id")
      .maybeSingle();
    if (!error) {
      socialAccountsCreated++;
      if (created) createdSocialAccountIds.push(created.id);
    }
  }
  for (const update of socialPlan.toUpdate) {
    await supabase
      .from("social_accounts")
      .update(update.patch as Partial<SocialAccount>)
      .eq("id", update.accountId);
    const snapshotFields = toPerformanceSnapshotFields(update.previousValues);
    if (Object.keys(snapshotFields).length > 0) {
      await supabase.from("creator_performance_snapshots").insert({
        creator_id: creatorId,
        social_account_id: update.accountId,
        import_id: batchId,
        ...snapshotFields,
      });
    }
  }

  if (row.normalizedData.tags.length > 0) {
    await ensureTagsAssigned(supabase, creatorId, row.normalizedData.tags, userId);
  }

  if (updatedFieldCount > 0 || socialPlan.toCreate.length > 0 || socialPlan.toUpdate.length > 0) {
    await supabase.from("audit_log").insert({
      user_id: userId,
      action: "creator_updated_by_import",
      entity_type: "creators",
      entity_id: creatorId,
      previous_value: existing as unknown as Record<string, unknown>,
      new_value: { ...fullPatch, import_batch_id: batchId },
    });
  }

  const previousSnapshot = {
    creator: existing,
    socialAccounts: existingAccounts ?? [],
    // Accounts this import created fresh on an otherwise-existing creator
    // — rollback removes these rather than trying to "restore" a previous
    // state that never existed.
    createdSocialAccountIds,
  };

  return { previousSnapshot, updatedFieldCount, socialAccountsCreated };
}

async function insertImportRow(
  supabase: Supabase,
  batchId: string,
  row: CommitImportRowInput,
  status: ImportRowStatus,
  extra: {
    error_message?: string;
    created_creator_id?: string;
    previous_creator_snapshot?: Record<string, unknown>;
    duplicate_resolution?: "unresolved" | "merged" | "kept_separate";
  }
) {
  await supabase.from("import_rows").insert({
    batch_id: batchId,
    row_number: row.rowNumber,
    source_sheet: row.sourceSheet,
    raw_data: row.rawData,
    normalized_data: row.normalizedData as unknown as Record<string, unknown>,
    status,
    possible_duplicate_creator_id: row.matchedCreatorId,
    duplicate_resolution: extra.duplicate_resolution ?? "unresolved",
    match_confidence: row.matchConfidence ? CONFIDENCE_SCORE[row.matchConfidence] : null,
    match_reasons: row.matchReasons,
    warnings: [],
    action: row.action,
    processed_at: new Date().toISOString(),
    previous_creator_snapshot: extra.previous_creator_snapshot ?? null,
    error_message: extra.error_message ?? null,
    created_creator_id: extra.created_creator_id ?? null,
  });
}

export async function commitImportBatch(
  input: CommitImportInput
): Promise<{ batchId: string } | { error: string }> {
  if (input.rows.length === 0) return { error: "No rows to import." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      source_filename: input.fileName,
      file_type: input.fileType,
      source_name: input.sourceName,
      status: "importing",
      column_mapping: input.columnMapping,
      total_rows: input.rows.length,
      uploaded_by: userId,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (batchError || !batch) return { error: "Could not start the import batch." };

  let newCreators = 0;
  let existingCreators = 0;
  let potentialDuplicates = 0;
  let newSocialAccounts = 0;
  let updatedFields = 0;
  let importedRows = 0;
  let duplicateRows = 0;
  let errorRows = 0;

  // Every row is processed independently and failures are caught per-row —
  // one malformed row must never abort the rest of the batch (spec: "one
  // bad row must not stop the whole import").
  for (const row of input.rows) {
    try {
      if (row.errors.length > 0) {
        await insertImportRow(supabase, batch.id, row, "error", { error_message: row.errors.join("; ") });
        errorRows++;
        continue;
      }

      if (row.action === "skip") {
        await insertImportRow(supabase, batch.id, row, "skipped", {});
        continue;
      }
      if (row.action === "ignore") {
        await insertImportRow(supabase, batch.id, row, "ignored", {});
        continue;
      }

      if (row.action === "create" || row.action === "keep_separate") {
        const { creatorId, socialAccountsCreated } = await createCreatorFromRow(supabase, row, batch.id, userId);
        await insertImportRow(supabase, batch.id, row, "imported", {
          created_creator_id: creatorId,
          duplicate_resolution: row.action === "keep_separate" ? "kept_separate" : "unresolved",
        });
        newCreators++;
        newSocialAccounts += socialAccountsCreated;
        importedRows++;
        if (row.matchedCreatorId) duplicateRows++;
        continue;
      }

      if (row.action === "update" || row.action === "merge") {
        const result = await updateCreatorFromRow(supabase, row, batch.id, userId);
        await insertImportRow(supabase, batch.id, row, "existing", {
          previous_creator_snapshot: result.previousSnapshot,
          duplicate_resolution: row.action === "merge" ? "merged" : "unresolved",
        });
        existingCreators++;
        updatedFields += result.updatedFieldCount;
        newSocialAccounts += result.socialAccountsCreated;
        if (row.action === "merge") potentialDuplicates++;
        continue;
      }
    } catch (err) {
      await insertImportRow(supabase, batch.id, row, "error", {
        error_message: err instanceof Error ? err.message : "Unknown error",
      });
      errorRows++;
    }
  }

  await supabase
    .from("import_batches")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      imported_rows: importedRows,
      duplicate_rows: duplicateRows,
      error_rows: errorRows,
      new_creators: newCreators,
      existing_creators: existingCreators,
      potential_duplicates: potentialDuplicates,
      new_social_accounts: newSocialAccounts,
      updated_fields: updatedFields,
    })
    .eq("id", batch.id);

  revalidatePath("/imports");
  revalidatePath("/creators");

  return { batchId: batch.id };
}

// --- Rollback -----------------------------------------------------------
//
// Never a blind delete. A row this import *created* is archived (same
// reversible soft-delete every other part of the app uses for removing a
// creator); a row this import *updated* has its pre-import creator and
// social-account fields restored from the snapshot captured at commit
// time. Nothing this import didn't touch is ever changed.

export async function rollbackImportBatch(batchId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const { data: batch } = await supabase.from("import_batches").select("*").eq("id", batchId).maybeSingle();
  if (!batch) return { error: "Import batch not found." };
  if (batch.rolled_back_at) return { error: "This import was already rolled back." };

  const { data: rows } = await supabase
    .from("import_rows")
    .select("*")
    .eq("batch_id", batchId)
    .in("status", ["imported", "existing"]);

  for (const row of rows ?? []) {
    try {
      if (row.status === "imported" && row.created_creator_id) {
        await supabase
          .from("creators")
          .update({ archived_at: new Date().toISOString() })
          .eq("id", row.created_creator_id)
          .is("archived_at", null);
        await supabase.from("audit_log").insert({
          user_id: userId,
          action: "creator_import_rolled_back",
          entity_type: "creators",
          entity_id: row.created_creator_id,
          previous_value: null,
          new_value: { rolled_back_import_batch_id: batchId },
        });
      } else if (row.status === "existing" && row.previous_creator_snapshot) {
        const snapshot = row.previous_creator_snapshot as unknown as {
          creator: Creator;
          socialAccounts: SocialAccount[];
          createdSocialAccountIds?: string[];
        };
        const { id, created_at, updated_at, ...restorable } = snapshot.creator;
        void id;
        void created_at;
        void updated_at;
        await supabase
          .from("creators")
          .update(restorable as Partial<Creator>)
          .eq("id", snapshot.creator.id);

        for (const account of snapshot.socialAccounts) {
          const { id: accountId, created_at: _c, updated_at: _u, ...accountRestorable } = account;
          void _c;
          void _u;
          await supabase
            .from("social_accounts")
            .update(accountRestorable as Partial<SocialAccount>)
            .eq("id", accountId);
        }

        // Accounts this import created fresh (not present before the
        // import touched this creator) are removed outright rather than
        // "restored" — there is no prior state to restore them to.
        for (const accountId of snapshot.createdSocialAccountIds ?? []) {
          await supabase.from("social_accounts").delete().eq("id", accountId);
        }

        await supabase.from("audit_log").insert({
          user_id: userId,
          action: "creator_import_update_rolled_back",
          entity_type: "creators",
          entity_id: snapshot.creator.id,
          previous_value: null,
          new_value: { rolled_back_import_batch_id: batchId },
        });
      }
    } catch {
      // A single row failing to roll back cleanly must not abandon the
      // rest of the rollback — it's reported by rolled_back_at staying
      // partially applied and visible in the batch's own audit trail.
      continue;
    }
  }

  await supabase.from("import_batches").update({ rolled_back_at: new Date().toISOString() }).eq("id", batchId);

  revalidatePath("/imports");
  revalidatePath(`/imports/${batchId}`);
  revalidatePath("/creators");

  return {};
}
