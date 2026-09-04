import { Link2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";

export default async function ContentTrackerPage() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("content_posts")
    .select("*", { count: "exact", head: true });

  return (
    <div>
      <PageHeader
        title="Content Tracker"
        description="Paste a post URL, track deliverables, and log metrics — automatically where APIs allow, manually where they don't."
      />
      <EmptyState
        icon={Link2}
        title={count ? `${count} content posts tracked` : "No content tracked yet"}
        description="URL submission, story tracking, and manual/API metric entry land in Phase 5. The schema and demo content history are already in place."
      />
    </div>
  );
}
