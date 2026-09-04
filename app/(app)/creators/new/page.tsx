import { PageHeader } from "@/components/ui/page-header";
import { CreatorForm } from "@/components/creators/creator-form";
import { createCreator } from "@/app/(app)/creators/actions";

export default function NewCreatorPage() {
  return (
    <div>
      <PageHeader title="Add creator" description="Create a new record in the creator database." />
      <div className="card max-w-3xl p-6">
        <CreatorForm action={createCreator} submitLabel="Create creator" />
      </div>
    </div>
  );
}
