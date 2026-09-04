import { Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";

export default async function CreatorsPage() {
  const supabase = await createClient();
  const { count } = await supabase.from("creators").select("*", { count: "exact", head: true });

  return (
    <div>
      <PageHeader
        title="Creators"
        description="The single source of truth for every creator the agency works with."
      />
      <EmptyState
        icon={Users}
        title={
          count ? `${count} creators in the database` : "The creator database is ready to fill"
        }
        description="Search, filters, profiles, and CRUD land in Phase 2. The schema, RLS, and demo data are already in place."
      />
    </div>
  );
}
