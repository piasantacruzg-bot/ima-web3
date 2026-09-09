"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { syncSocialAccount } from "@/lib/sync";
import type { SyncOutcome } from "@/lib/sync";

export async function syncAccountNow(socialAccountId: string): Promise<SyncOutcome> {
  const outcome = await syncSocialAccount(socialAccountId);
  revalidatePath("/settings/integrations");
  revalidatePath("/content");
  return outcome;
}

export interface BulkSyncSummary {
  accountsSynced: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
}

// Spec section 38: "Sync all connected accounts" — sequential, not
// parallel, so a slow/misbehaving provider can't starve the others'
// rate limits; each account's own outcome still lands in
// integration_sync_logs individually.
export async function syncAllConnectedAccounts(): Promise<BulkSyncSummary> {
  const supabase = await createClient();
  const { data: accounts } = await supabase.from("social_accounts").select("id").eq("is_connected", true);

  const summary: BulkSyncSummary = { accountsSynced: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0 };
  for (const account of accounts ?? []) {
    const outcome = await syncSocialAccount(account.id);
    summary.accountsSynced += 1;
    summary.recordsCreated += outcome.recordsCreated;
    summary.recordsUpdated += outcome.recordsUpdated;
    summary.recordsFailed += outcome.recordsFailed;
  }

  revalidatePath("/settings/integrations");
  revalidatePath("/content");
  return summary;
}

export async function disconnectAccount(socialAccountId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  await supabase
    .from("social_accounts")
    .update({ is_connected: false, oauth_status: "not_connected", access_token_reference: null, token_expires_at: null })
    .eq("id", socialAccountId);
  await supabase.from("integration_tokens").delete().eq("social_account_id", socialAccountId);
  await logAudit(supabase, "api_disconnected", "social_accounts", socialAccountId, null, {});
  revalidatePath("/settings/integrations");
  return {};
}
