import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CreatorForm } from "@/components/creators/creator-form";
import { updateCreator, deleteCreator } from "@/app/(app)/creators/actions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export default async function EditCreatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: creator } = await supabase.from("creators").select("*").eq("id", id).maybeSingle();
  if (!creator) notFound();

  const user = await getCurrentUser();
  const isAdmin = user?.profile?.role === "admin";
  const boundUpdate = updateCreator.bind(null, id);
  const boundDelete = deleteCreator.bind(null, id);

  return (
    <div>
      <PageHeader
        title={`Edit ${creator.display_name}`}
        actions={
          isAdmin ? (
            <form action={boundDelete}>
              <button type="submit" className="btn-secondary border-status-danger/30 text-status-danger">
                Delete creator
              </button>
            </form>
          ) : null
        }
      />
      {error ? (
        <p className="mb-4 rounded-sm border border-status-danger/30 bg-status-danger/5 px-3 py-2 text-sm text-status-danger">
          {error}
        </p>
      ) : null}
      <div className="card max-w-3xl p-6">
        <CreatorForm action={boundUpdate} creator={creator} submitLabel="Save changes" />
      </div>
    </div>
  );
}
