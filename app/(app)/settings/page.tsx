import { Settings } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: appSettings }, { data: weights }] = await Promise.all([
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("creator_scoring_weights").select("*").eq("id", 1).maybeSingle(),
  ]);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Agency info, creator scoring weights, sync frequency, and user roles."
      />

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
          Agency
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Agency name" value={appSettings?.agency_name ?? "—"} />
          <StatCard label="Default currency" value={appSettings?.default_currency ?? "—"} />
          <StatCard
            label="Sync frequency"
            value={appSettings ? `Every ${appSettings.sync_frequency_hours}h` : "—"}
            hint="Applies once live API sync ships in Phase 6/7"
          />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
          Creator scoring weights
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Engagement" value={`${weights?.engagement_weight ?? 0}%`} />
          <StatCard label="Avg. views" value={`${weights?.avg_views_weight ?? 0}%`} />
          <StatCard
            label="Historical performance"
            value={`${weights?.historical_performance_weight ?? 0}%`}
          />
          <StatCard label="Audience fit" value={`${weights?.audience_fit_weight ?? 0}%`} />
          <StatCard label="Brand fit" value={`${weights?.brand_fit_weight ?? 0}%`} />
          <StatCard label="Cost efficiency" value={`${weights?.cost_efficiency_weight ?? 0}%`} />
          <StatCard label="Reliability" value={`${weights?.reliability_weight ?? 0}%`} />
        </div>
      </section>

      <div className="card flex items-center gap-3 px-5 py-4 text-sm text-ink-soft">
        <Settings size={16} strokeWidth={1.75} className="shrink-0" />
        Editing these values, plus report settings and user role management, ships alongside the
        Creator Recommendation Engine in Phase 8. Values above are the real defaults seeded in the
        database.
      </div>
    </div>
  );
}
