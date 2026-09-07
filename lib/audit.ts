import type { createClient } from "@/lib/supabase/server";

// Shared audit_log writer — extracted from what was a private helper
// inside app/(app)/creators/actions.ts so campaign actions (Phase 4) can
// log the same way without duplicating the insert shape.
export async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: string,
  entityType: string,
  entityId: string,
  previousValue: Record<string, unknown> | null,
  newValue: Record<string, unknown>
) {
  const { data: userData } = await supabase.auth.getUser();
  await supabase.from("audit_log").insert({
    user_id: userData.user?.id ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    previous_value: previousValue,
    new_value: newValue,
  });
}
