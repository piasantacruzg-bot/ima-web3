// DB-touching orchestrator for the deterministic rules in
// lib/automation/rules.ts. Writes notifications and de-duplicates
// against any already-unread notification for the same rule + entity, so
// running this repeatedly doesn't spam the same alert. When
// RESEND_API_KEY/NOTIFICATION_EMAIL_FROM are set, also emails the
// recipient — best-effort, recorded on the row (email_sent_at/
// email_error), never blocking the in-app notification (still the
// source of truth) if delivery fails or isn't configured.

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { getAllExecutionRows, getTrackerItems } from "@/lib/execution";
import { isDeliverableOverdue, isMetricsMissing, isEvidenceMissing, isConnectionExpired } from "@/lib/automation/rules";
import { isEmailConfigured, sendNotificationEmail } from "@/lib/notifications/email";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface AutomationRunResult {
  notificationsCreated: number;
  notificationsSkippedDuplicate: number;
}

async function getEnabledRuleConfig(supabase: Supabase, ruleKey: string): Promise<Record<string, unknown> | null> {
  const { data } = await supabase.from("automation_rules").select("is_enabled, config").eq("rule_key", ruleKey).maybeSingle();
  if (!data || !data.is_enabled) return null;
  return data.config;
}

async function getManagerUserIds(supabase: Supabase): Promise<string[]> {
  const { data } = await supabase.from("profiles").select("id").in("role", ["admin", "manager"]);
  return (data ?? []).map((p) => p.id);
}

async function hasUnreadNotification(supabase: Supabase, userId: string, type: string, entityColumn: string, entityId: string): Promise<boolean> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", type)
    .eq(entityColumn, entityId)
    .is("read_at", null);
  return (count ?? 0) > 0;
}

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  campaignId?: string;
  creatorId?: string;
  deliverableId?: string;
  contentPostId?: string;
}

async function createNotificationIfNew(
  supabase: Supabase,
  input: CreateNotificationInput,
  result: AutomationRunResult,
  emailEnabled: boolean
): Promise<void> {
  const entityColumn = input.deliverableId ? "deliverable_id" : input.contentPostId ? "content_post_id" : input.campaignId ? "campaign_id" : "creator_id";
  const entityId = input.deliverableId ?? input.contentPostId ?? input.campaignId ?? input.creatorId;
  if (!entityId) return;

  if (await hasUnreadNotification(supabase, input.userId, input.type, entityColumn, entityId)) {
    result.notificationsSkippedDuplicate += 1;
    return;
  }

  // Resolved and sent before the insert (rather than a follow-up
  // update) so the result lands in the same row the staff-only insert
  // policy already permits — notifications_update_own would otherwise
  // silently no-op this when the acting session isn't the recipient.
  let emailSentAt: string | null = null;
  let emailError: string | null = null;
  if (emailEnabled) {
    const { data: profile } = await supabase.from("profiles").select("email").eq("id", input.userId).maybeSingle();
    if (profile?.email) {
      const emailResult = await sendNotificationEmail({ to: profile.email, title: input.title, body: input.body ?? null });
      if (emailResult.ok) emailSentAt = new Date().toISOString();
      else emailError = emailResult.error;
    }
  }

  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    campaign_id: input.campaignId ?? null,
    creator_id: input.creatorId ?? null,
    deliverable_id: input.deliverableId ?? null,
    content_post_id: input.contentPostId ?? null,
    email_sent_at: emailSentAt,
    email_error: emailError,
  });
  if (error) {
    console.error(`[automation] failed to create notification (${input.type})`, error);
    return;
  }
  result.notificationsCreated += 1;
}

export async function runAutomationRules(supabaseOverride?: Supabase): Promise<AutomationRunResult> {
  const supabase = supabaseOverride ?? (await createClient());
  const result: AutomationRunResult = { notificationsCreated: 0, notificationsSkippedDuplicate: 0 };
  const managerIds = await getManagerUserIds(supabase);
  const emailEnabled = isEmailConfigured();

  const overdueConfig = await getEnabledRuleConfig(supabase, "deliverable_overdue");
  if (overdueConfig) {
    const { data: deliverables } = await supabase
      .from("deliverables")
      .select("id, status, due_date, campaign_id, creator_id, title, content_type")
      .not("due_date", "is", null);
    for (const d of deliverables ?? []) {
      if (!isDeliverableOverdue(d)) continue;
      for (const userId of managerIds) {
        await createNotificationIfNew(supabase, {
          userId,
          type: "deliverable_overdue",
          title: "Deliverable overdue",
          body: d.title ?? d.content_type.replace(/_/g, " "),
          campaignId: d.campaign_id,
          creatorId: d.creator_id,
          deliverableId: d.id,
        }, result, emailEnabled);
      }
    }
  }

  const metricsConfig = await getEnabledRuleConfig(supabase, "metrics_missing");
  const evidenceConfig = await getEnabledRuleConfig(supabase, "evidence_missing");
  if (metricsConfig || evidenceConfig) {
    const rows = await getAllExecutionRows();
    const items = getTrackerItems(rows);
    const graceHours = typeof metricsConfig?.grace_hours === "number" ? metricsConfig.grace_hours : 24;

    for (const item of items) {
      const isPublished = item.status === "published" || item.status === "metrics_collected";

      if (metricsConfig && isMetricsMissing({ isPublished, hasMetrics: item.hasMetrics, publishedAt: item.publishedAt }, graceHours)) {
        for (const userId of managerIds) {
          await createNotificationIfNew(supabase, {
            userId,
            type: "metrics_missing",
            title: "Metrics needed",
            body: `${item.creatorName} — ${item.title ?? item.contentType} on ${item.platform}`,
            campaignId: item.campaignId,
            deliverableId: item.deliverableId,
          }, result, emailEnabled);
        }
      }

      if (evidenceConfig && item.isStory && isEvidenceMissing({ isPublished, hasEvidence: item.hasEvidence })) {
        for (const userId of managerIds) {
          await createNotificationIfNew(supabase, {
            userId,
            type: "evidence_missing",
            title: `Story #${item.sequenceNumber ?? ""} needs screenshot evidence`,
            body: `${item.creatorName} — ${item.campaignName}`,
            campaignId: item.campaignId,
            deliverableId: item.deliverableId,
          }, result, emailEnabled);
        }
      }
    }
  }

  const connectionConfig = await getEnabledRuleConfig(supabase, "connection_expired");
  if (connectionConfig) {
    const { data: accounts } = await supabase.from("social_accounts").select("id, creator_id, platform, oauth_status, sync_status, is_connected");
    for (const account of accounts ?? []) {
      if (!account.is_connected) continue;
      if (!isConnectionExpired(account)) continue;

      const { data: token } = await supabase
        .from("integration_tokens")
        .select("connected_by")
        .eq("social_account_id", account.id)
        .maybeSingle();
      const recipients = token?.connected_by ? [token.connected_by] : managerIds;

      for (const userId of recipients) {
        await createNotificationIfNew(supabase, {
          userId,
          type: "connection_expired",
          title: `${account.platform[0].toUpperCase()}${account.platform.slice(1)} connection needs reauthorization`,
          creatorId: account.creator_id,
        }, result, emailEnabled);
      }
    }
  }

  if (result.notificationsCreated > 0) {
    // entity_id is a real (synthetic) uuid, not a literal like "batch" —
    // audit_log.entity_id is a uuid column; this run didn't touch one
    // single row, so there's no natural entity to point at.
    await logAudit(supabase, "automation_executed", "notifications", randomUUID(), null, {
      created: result.notificationsCreated,
      skipped_duplicate: result.notificationsSkippedDuplicate,
    });
  }

  return result;
}
