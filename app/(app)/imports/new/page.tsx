import { PageHeader } from "@/components/ui/page-header";
import { ImportWizard } from "@/components/imports/import-wizard";

export default function NewImportPage() {
  return (
    <div>
      <PageHeader
        title="Import creators"
        description="Upload a CSV or Excel file: map columns, review duplicate matches, and confirm before anything is written."
      />
      <ImportWizard />
    </div>
  );
}
