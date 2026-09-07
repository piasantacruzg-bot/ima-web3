import { Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";

export default async function ImportsPage() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("import_batches")
    .select("*", { count: "exact", head: true });

  return (
    <div>
      <PageHeader
        title="Imports"
        description="Upload old CSV/XLSX creator databases: preview, map columns, normalize, detect duplicates, import."
      />
      <EmptyState
        icon={Upload}
        title={count ? `${count} import batches on record` : "No imports yet"}
        description="The upload, column-mapping, and duplicate-detection wizard lands in Phase 3. The import_batches / import_rows schema is already in place."
      />
    </div>
  );
}
