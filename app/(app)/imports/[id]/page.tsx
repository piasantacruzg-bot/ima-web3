import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { RollbackButton } from "@/components/imports/rollback-button";

const ROW_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  imported: "Imported",
  duplicate: "Potential duplicate",
  error: "Error",
  skipped: "Skipped",
  existing: "Updated existing",
  ignored: "Ignored",
};

export default async function ImportBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: batch }, { data: rows }] = await Promise.all([
    supabase.from("import_batches").select("*").eq("id", id).maybeSingle(),
    supabase.from("import_rows").select("*").eq("batch_id", id).order("row_number").limit(500),
  ]);

  if (!batch) notFound();

  const canRollback = batch.status === "completed" && !batch.rolled_back_at;

  return (
    <div>
      <PageHeader
        title={batch.source_filename}
        description={`Imported ${new Date(batch.created_at).toLocaleString()}${
          batch.source_name ? ` · Source: ${batch.source_name}` : ""
        }`}
        actions={canRollback ? <RollbackButton batchId={batch.id} /> : undefined}
      />

      {batch.rolled_back_at ? (
        <p className="mb-4 rounded-sm border border-status-warning/30 bg-status-warning/5 px-3 py-2 text-sm text-status-warning">
          This import was rolled back on {new Date(batch.rolled_back_at).toLocaleString()}.
        </p>
      ) : null}

      <dl className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total rows" value={batch.total_rows} />
        <Stat label="New creators" value={batch.new_creators} />
        <Stat label="Updated creators" value={batch.existing_creators} />
        <Stat label="Potential duplicates" value={batch.potential_duplicates} />
        <Stat label="New social accounts" value={batch.new_social_accounts} />
        <Stat label="Updated fields" value={batch.updated_fields} />
        <Stat label="Errors" value={batch.error_rows} />
        <Stat label="Status" value={batch.status} isText />
      </dl>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="p-3">Row</th>
                <th className="p-3">Status</th>
                <th className="p-3">Creator</th>
                <th className="p-3">Match confidence</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((row) => {
                const creatorId = row.created_creator_id ?? row.possible_duplicate_creator_id;
                return (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="p-3 text-ink-soft">{row.row_number}</td>
                    <td className="p-3">{ROW_STATUS_LABELS[row.status] ?? row.status}</td>
                    <td className="p-3">
                      {creatorId ? (
                        <Link href={`/creators/${creatorId}`} className="text-ink underline">
                          View creator
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3">{row.match_confidence ?? "—"}</td>
                    <td className="p-3 text-ink-soft">
                      {row.error_message || row.match_reasons.join("; ") || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(rows ?? []).length === 500 ? (
          <p className="p-3 text-xs text-ink-soft">Showing the first 500 rows.</p>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, isText = false }: { label: string; value: number | string; isText?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={isText ? "text-lg font-medium capitalize text-ink" : "text-2xl font-medium text-ink"}>{value}</p>
    </div>
  );
}
