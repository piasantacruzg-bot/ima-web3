import Link from "next/link";
import { notFound } from "next/navigation";
import { Users, Package, DollarSign, Archive, RotateCcw, Pencil, Link2, FileBarChart } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getCampaignDetail, getCampaignDeliverables } from "@/lib/campaigns";
import { archiveCampaign, restoreCampaign } from "@/app/(app)/campaigns/actions";
import {
  getCampaignExecutionRows,
  getCampaignAggregateMetrics,
  getCampaignReadiness,
  getCreatorPerformanceRows,
  getTrackerItems,
} from "@/lib/execution";
import { DeliverablePerformanceTable } from "@/components/content/deliverable-performance-table";
import { CreatorPerformanceTable } from "@/components/content/creator-performance-table";
import { ActivityFeed } from "@/components/content/activity-feed";
import { getCampaignActivity } from "@/lib/activity";
import { getCampaignAutomationSummary } from "@/lib/integrations-status";
import { CampaignSyncButton } from "@/components/integrations/campaign-sync-button";
import { PLATFORM_LABEL } from "@/lib/content-labels";
import { formatCompactNumber, formatCurrency, formatDate, formatDateTime, formatMetric, formatMetricRate, formatPercent } from "@/lib/format";
import type { CampaignStatus } from "@/types/database";

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: "border-line text-ink-soft",
  proposal: "border-status-info/30 text-status-info",
  approved: "border-status-info/30 text-status-info",
  recruiting: "border-status-warning/30 text-status-warning",
  active: "border-status-success/30 text-status-success",
  completed: "border-line text-ink-soft",
  cancelled: "border-status-danger/30 text-status-danger",
};

export default async function CampaignDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getCampaignDetail(id);
  if (!detail) notFound();

  const { campaign, creatorCounts, deliverableCounts, budget, estimated } = detail;
  const deliverables = await getCampaignDeliverables(id);
  const upcomingDeliverables = deliverables.filter((d) => d.due_date).slice(0, 5);
  const boundArchive = archiveCampaign.bind(null, id);
  const boundRestore = restoreCampaign.bind(null, id);

  const executionRows = await getCampaignExecutionRows(id);
  const performance = getCampaignAggregateMetrics(executionRows);
  const readiness = getCampaignReadiness(executionRows);
  const creatorPerformance = getCreatorPerformanceRows(executionRows);
  const trackerItems = getTrackerItems(executionRows);
  const activity = await getCampaignActivity(id, executionRows);
  const automation = await getCampaignAutomationSummary(id);

  return (
    <div>
      {campaign.archived_at ? (
        <p className="mb-4 flex items-center justify-between rounded-sm border border-line bg-line-soft px-3 py-2 text-sm text-ink-soft">
          <span>Archived {formatDate(campaign.archived_at)}.</span>
          <form action={boundRestore}>
            <button type="submit" className="btn-secondary py-1">
              <RotateCcw size={13} strokeWidth={1.75} />
              Restore
            </button>
          </form>
        </p>
      ) : null}

      <PageHeader
        title={campaign.campaign_name}
        description={`${campaign.client_name}${campaign.brand_name ? ` · ${campaign.brand_name}` : ""}`}
        actions={
          <>
            <span className={`badge capitalize ${STATUS_STYLES[campaign.status]}`}>{campaign.status}</span>
            <Link href={`/campaigns/${id}/creators`} className="btn-secondary">
              <Users size={15} strokeWidth={1.75} />
              Creators
            </Link>
            <Link href={`/campaigns/${id}/content`} className="btn-secondary">
              <Link2 size={15} strokeWidth={1.75} />
              Content
            </Link>
            <Link href={`/campaigns/${id}/report`} className="btn-secondary">
              <FileBarChart size={15} strokeWidth={1.75} />
              Report
            </Link>
            <Link href={`/campaigns/${id}/edit`} className="btn-secondary">
              <Pencil size={15} strokeWidth={1.75} />
              Edit
            </Link>
            {!campaign.archived_at ? (
              <form action={boundArchive}>
                <button type="submit" className="btn-secondary">
                  <Archive size={15} strokeWidth={1.75} />
                  Archive
                </button>
              </form>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Overview</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-ink-soft">Objective</dt>
                <dd className="text-ink">{campaign.primary_objective ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Market</dt>
                <dd className="text-ink">
                  {campaign.market ?? ([campaign.city, campaign.country].filter(Boolean).join(", ") || "—")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Dates</dt>
                <dd className="text-ink">
                  {formatDate(campaign.start_date)} – {formatDate(campaign.end_date)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Budget</dt>
                <dd className="text-ink">{formatCurrency(campaign.budget)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Platforms</dt>
                <dd className="text-ink capitalize">{campaign.target_platforms.join(", ") || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Categories</dt>
                <dd className="text-ink">{campaign.target_categories.join(", ") || "—"}</dd>
              </div>
            </dl>
            {campaign.description ? <p className="mt-4 text-sm text-ink-soft">{campaign.description}</p> : null}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                Estimated reach <span className="normal-case text-ink-soft/70">(from selected creators — not actual performance)</span>
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Est. followers" value={formatCompactNumber(estimated.followers)} />
              <StatCard label="Est. avg. engagement" value={formatPercent(estimated.engagementRate)} />
              <StatCard label="Est. avg. views" value={formatCompactNumber(estimated.averageViews)} />
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              Actual performance from tracked content appears below, once creators start publishing.
            </p>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                Execution readiness <span className="normal-case text-ink-soft/70">({readiness.readinessPercent}% ready)</span>
              </h2>
              <Link href={`/campaigns/${id}/content`} className="text-xs text-ink-soft underline">
                View content tracker
              </Link>
            </div>
            {readiness.blockers.length === 0 ? (
              <p className="text-sm text-status-success">Nothing blocking this report.</p>
            ) : (
              <ul className="card divide-y divide-line text-sm">
                {readiness.blockers.map((b) => (
                  <li key={b} className="px-4 py-2 text-ink-soft">
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
              Performance <span className="normal-case text-ink-soft/70">(computed from every tracked deliverable)</span>
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Views" value={formatMetric(performance.views)} />
              <StatCard label="Engagements" value={formatMetric(performance.engagements)} />
              <StatCard label="Engagement rate" value={formatMetricRate(performance.engagement_rate)} />
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wide text-ink-soft">Automation</h2>
              <CampaignSyncButton campaignId={id} />
            </div>
            <dl className="card grid grid-cols-2 gap-4 p-4 text-sm md:grid-cols-3">
              <div>
                <dt className="text-xs text-ink-soft">Connected platforms</dt>
                <dd className="text-ink">
                  {automation.connectedPlatforms.length > 0 ? automation.connectedPlatforms.map((p) => PLATFORM_LABEL[p]).join(", ") : "None"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Last sync</dt>
                <dd className="text-ink">{automation.lastSyncAt ? formatDateTime(automation.lastSyncAt) : "Never"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Next sync</dt>
                <dd className="text-ink">{automation.nextSyncAt ? formatDateTime(automation.nextSyncAt) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Content discovered</dt>
                <dd className="text-ink">{automation.contentDiscovered}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Metrics updated</dt>
                <dd className="text-ink">{automation.metricsUpdated}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Sync errors</dt>
                <dd className={automation.syncErrors > 0 ? "text-status-danger" : "text-ink"}>{automation.syncErrors}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Timeline</h2>
            <ul className="card divide-y divide-line text-sm">
              <li className="flex justify-between px-4 py-2">
                <span className="text-ink-soft">Campaign start</span>
                <span className="text-ink">{formatDate(campaign.start_date)}</span>
              </li>
              {upcomingDeliverables.map((d) => (
                <li key={d.id} className="flex justify-between px-4 py-2">
                  <span className="text-ink-soft capitalize">{d.content_type.replace(/_/g, " ")} due</span>
                  <span className="text-ink">{formatDate(d.due_date)}</span>
                </li>
              ))}
              <li className="flex justify-between px-4 py-2">
                <span className="text-ink-soft">Campaign end</span>
                <span className="text-ink">{formatDate(campaign.end_date)}</span>
              </li>
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <StatCard label="Total creators" value={String(creatorCounts.total)} />
          <StatCard label="Selected creators" value={String(creatorCounts.selected)} hint={`${creatorCounts.shortlisted} shortlisted`} />

          <section className="card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
              <Package size={13} strokeWidth={1.75} />
              Deliverables
            </h2>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Total</dt>
                <dd className="text-ink">{deliverableCounts.total}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Completed</dt>
                <dd className="text-ink">{deliverableCounts.completed}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Pending</dt>
                <dd className="text-ink">{deliverableCounts.pending}</dd>
              </div>
            </dl>
          </section>

          <section className="card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
              <DollarSign size={13} strokeWidth={1.75} />
              Budget
            </h2>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Creator budget</dt>
                <dd className="text-ink">{formatCurrency(budget.creatorBudget)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Estimated spend</dt>
                <dd className="text-ink">{formatCurrency(budget.estimatedCreatorSpend)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Confirmed spend</dt>
                <dd className="text-ink">{formatCurrency(budget.confirmedCreatorSpend)}</dd>
              </div>
              {budget.creatorBudgetRemaining !== null ? (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Remaining</dt>
                  <dd className={budget.isOverCreatorBudget ? "text-status-danger" : "text-ink"}>
                    {formatCurrency(budget.creatorBudgetRemaining)}
                  </dd>
                </div>
              ) : null}
            </dl>
            {budget.warnings.map((w) => (
              <p key={w} className="mt-2 text-xs text-status-warning">
                ⚠ {w}
              </p>
            ))}
          </section>

          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Recent activity</h2>
            <ActivityFeed entries={activity} />
          </section>
        </div>
      </div>

      {executionRows.length > 0 ? (
        <div className="mt-6 space-y-6">
          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Creator performance</h2>
            <CreatorPerformanceTable rows={creatorPerformance} />
          </section>

          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
              Deliverable performance <span className="normal-case text-ink-soft/70">({trackerItems.length} tracked individually)</span>
            </h2>
            <DeliverablePerformanceTable items={trackerItems} />
          </section>
        </div>
      ) : null}
    </div>
  );
}
