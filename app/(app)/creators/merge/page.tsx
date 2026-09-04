import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { getMergeFields } from "@/lib/creator-merge";
import { mergeCreators } from "@/app/(app)/creators/merge/actions";

export default async function MergeCreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string; error?: string }>;
}) {
  const { a, b, error } = await searchParams;
  if (!a || !b) notFound();

  const supabase = await createClient();
  const [{ data: primary }, { data: duplicate }] = await Promise.all([
    supabase.from("creators").select("*").eq("id", a).maybeSingle(),
    supabase.from("creators").select("*").eq("id", b).maybeSingle(),
  ]);
  if (!primary || !duplicate) notFound();

  const fields = getMergeFields(primary, duplicate);
  const conflicts = fields.filter((f) => f.conflict);

  return (
    <div>
      <PageHeader
        title="Merge creators"
        description="Choose a primary record. Social accounts, notes, tags, campaigns, and performance history from both move to the primary; the other is archived, never deleted."
      />

      {error ? (
        <p className="mb-4 rounded-sm border border-status-danger/30 bg-status-danger/5 px-3 py-2 text-sm text-status-danger">
          {error}
        </p>
      ) : null}

      <div className="mb-4 flex items-center gap-3">
        <div className="card flex-1 p-3">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Primary (kept)</p>
          <p className="font-medium text-ink">{primary.display_name}</p>
        </div>
        <Link
          href={`/creators/merge?a=${b}&b=${a}`}
          className="btn-secondary shrink-0"
          title="Swap which record is primary"
        >
          <ArrowLeftRight size={14} strokeWidth={1.75} />
        </Link>
        <div className="card flex-1 p-3">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Duplicate (archived after merge)</p>
          <p className="font-medium text-ink">{duplicate.display_name}</p>
        </div>
      </div>

      <form action={mergeCreators} className="space-y-4">
        <input type="hidden" name="primary_id" value={primary.id} />
        <input type="hidden" name="duplicate_id" value={duplicate.id} />

        {conflicts.length === 0 ? (
          <p className="card p-4 text-sm text-ink-soft">
            No conflicting fields — everything else will combine automatically.
          </p>
        ) : (
          <div className="card divide-y divide-line">
            {conflicts.map((field) => (
              <div key={field.key} className="p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
                  {field.label}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-start gap-2 rounded-sm border border-line p-2 text-sm">
                    <input
                      type="radio"
                      name={`field_${field.key}`}
                      value="a"
                      defaultChecked
                      className="mt-0.5"
                    />
                    <span>{String(field.valueA)}</span>
                  </label>
                  <label className="flex items-start gap-2 rounded-sm border border-line p-2 text-sm">
                    <input type="radio" name={`field_${field.key}`} value="b" className="mt-0.5" />
                    <span>{String(field.valueB)}</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            Merge into {primary.display_name}
          </button>
          <Link href={`/creators/${primary.id}`} className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
