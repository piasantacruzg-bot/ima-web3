import Link from "next/link";
import { PlusCircle, UserPlus, Upload, Link2, FileBarChart, CalendarClock } from "lucide-react";
import { getDashboardData } from "@/lib/dashboard";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const QUICK_ACTIONS = [
  { href: "/campaigns", label: "New Campaign", icon: PlusCircle },
  { href: "/creators/new", label: "Add Creator", icon: UserPlus },
  { href: "/imports", label: "Import Database", icon: Upload },
  { href: "/content", label: "Add Content", icon: Link2 },
  { href: "/reports", label: "Generate Report", icon: FileBarChart },
] as const;

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Everything below is live from the database — demo data until real creators and campaigns are imported."
        actions={
          <div className="flex gap-2">
            {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="btn-secondary">
                <Icon size={15} strokeWidth={1.75} />
                {label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="mb-8 grid grid-cols-4 gap-4">
        <StatCard label="Active campaigns" value={String(data.activeCampaignsCount)} />
        <StatCard
          label="Pending deliverables"
          value={String(data.pendingDeliverablesCount)}
          hint="Not yet published or cancelled"
        />
        <StatCard label="Total creators" value={String(data.totalCreatorsCount)} />
        <StatCard label="Total campaigns" value={String(data.totalCampaignsCount)} />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-6">
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
            Campaigns ending soon
          </h2>
          {data.campaignsEndingSoon.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nothing wrapping up in the next 14 days"
              description="Active campaigns with an end date in this window will show up here."
            />
          ) : (
            <ul className="card divide-y divide-line">
              {data.campaignsEndingSoon.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-ink">{c.campaign_name}</span>
                  <span className="text-ink-soft">{formatDate(c.end_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
            Overdue deliverables
          </h2>
          {data.overdueDeliverables.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No overdue deliverables"
              description="Deliverables past their due date that aren't published or cancelled show up here."
            />
          ) : (
            <ul className="card divide-y divide-line">
              {data.overdueDeliverables.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="text-ink">
                      {d.creator_display_name ?? "Unknown creator"} · {d.content_type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-ink-soft">{d.campaign_name}</p>
                  </div>
                  <span className="badge border-status-danger/30 text-status-danger">
                    Due {formatDate(d.due_date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
            Recently added creators
          </h2>
          {data.recentCreators.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No creators yet"
              description="Import an old database or add creators one at a time to get started."
            />
          ) : (
            <ul className="card divide-y divide-line">
              {data.recentCreators.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <Link href={`/creators/${c.id}`} className="text-ink hover:underline">
                    {c.display_name}
                  </Link>
                  <span className="badge border-line text-ink-soft capitalize">{c.status.replace(/_/g, " ")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
            Recent content
          </h2>
          {data.recentContent.length === 0 ? (
            <EmptyState
              icon={Link2}
              title="No content tracked yet"
              description="Paste a post URL from the Content Tracker to start logging deliverables."
            />
          ) : (
            <ul className="card divide-y divide-line">
              {data.recentContent.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-ink">{c.creator_display_name ?? "Unknown creator"}</p>
                    <p className="truncate text-xs text-ink-soft">{c.campaign_name}</p>
                  </div>
                  <span className="badge border-line text-ink-soft capitalize">{c.platform}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
