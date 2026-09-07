import Link from "next/link";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Uploaded",
  mapped: "Mapped",
  previewed: "Previewed",
  importing: "Importing",
  completed: "Completed",
  failed: "Failed",
};

export default async function ImportsPage() {
  const supabase = await createClient();
  const { data: batches } = await supabase
    .from("import_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <PageHeader
        title="Imports"
        description="Upload old CSV/XLSX creator databases: preview, map columns, normalize, detect duplicates, import."
        actions={
          <Link href="/imports/new" className="btn-primary">
            New import
          </Link>
        }
      />

      {!batches || batches.length === 0 ? (
        <EmptyState
          icon={Upload}
          title="No imports yet"
          description="Start an import to bring in creators from an old spreadsheet or CRM export."
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="p-3">File</th>
                <th className="p-3">Status</th>
                <th className="p-3">Rows</th>
                <th className="p-3">New</th>
                <th className="p-3">Updated</th>
                <th className="p-3">Errors</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-b border-line last:border-0 hover:bg-paper">
                  <td className="p-3">
                    <Link href={`/imports/${b.id}`} className="font-medium text-ink underline">
                      {b.source_filename}
                    </Link>
                    {b.rolled_back_at ? (
                      <span className="badge ml-2 border-status-warning/30 text-status-warning">Rolled back</span>
                    ) : null}
                  </td>
                  <td className="p-3">{STATUS_LABELS[b.status] ?? b.status}</td>
                  <td className="p-3">{b.total_rows}</td>
                  <td className="p-3">{b.new_creators}</td>
                  <td className="p-3">{b.existing_creators}</td>
                  <td className="p-3">{b.error_rows}</td>
                  <td className="p-3 text-ink-soft">{new Date(b.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
