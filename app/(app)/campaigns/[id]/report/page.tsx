import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getCampaignDetail } from "@/lib/campaigns";
import {
  getCampaignExecutionRows,
  getCampaignAggregateMetrics,
  getCampaignReadiness,
  getCreatorPerformanceRows,
  getTrackerItems,
} from "@/lib/execution";
import { sumMetrics, type RawMetricSnapshot } from "@/lib/execution/aggregation";
import { DeliverablePerformanceTable } from "@/components/content/deliverable-performance-table";
import { CreatorPerformanceTable } from "@/components/content/creator-performance-table";
import { formatCurrency, formatDate, formatMetric, formatMetricRate } from "@/lib/format";
import { CONTENT_TYPE_LABEL, COMPLETENESS_LABEL, COMPLETENESS_STYLE } from "@/lib/content-labels";
import type { SocialPlatform } from "@/types/database";

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  facebook: "Facebook",
  other: "Other",
};

export default async function CampaignReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getCampaignDetail(id);
  if (!detail) notFound();
  const { campaign, creatorCounts, budget } = detail;

  const rows = await getCampaignExecutionRows(id);
  const trackerItems = getTrackerItems(rows);
  const performance = getCampaignAggregateMetrics(rows);
  const readiness = getCampaignReadiness(rows);
  const creatorPerformance = getCreatorPerformanceRows(rows);

  const platforms = [...new Set(trackerItems.map((i) => i.platform))];
  const byPlatform = platforms.map((platform) => {
    const items = trackerItems.filter((i) => i.platform === platform);
    return {
      platform,
      count: items.length,
      metrics: sumMetrics(items.map((i) => i.metrics as unknown as RawMetricSnapshot)),
    };
  });

  const storyRows = rows.filter((r) => r.isStory).flatMap((r) =>
    r.storyInstances.map((si) => ({ creatorName: r.creator.display_name, deliverableId: r.deliverable.id, si }))
  );

  const missingEvidence = trackerItems.filter((i) => !i.hasEvidence);
  const missingMetrics = trackerItems.filter((i) => !i.hasMetrics);
  const evidenceCompletePercent = trackerItems.length > 0 ? Math.round(((trackerItems.length - missingEvidence.length) / trackerItems.length) * 100) : 0;
  const metricsCompletePercent = trackerItems.length > 0 ? Math.round(((trackerItems.length - missingMetrics.length) / trackerItems.length) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${campaign.campaign_name} — Report`}
        description={`${campaign.client_name}${campaign.brand_name ? ` · ${campaign.brand_name}` : ""}`}
        actions={
          <Link href={`/campaigns/${id}`} className="btn-secondary">
            Back to dashboard
          </Link>
        }
      />

      {/* 1. Overview */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">1. Overview</h2>
        <div className="card grid grid-cols-2 gap-4 p-5 text-sm md:grid-cols-4">
          <Field label="Status" value={campaign.status} />
          <Field label="Dates" value={`${formatDate(campaign.start_date)} – ${formatDate(campaign.end_date)}`} />
          <Field label="Budget" value={formatCurrency(campaign.budget)} />
          <Field label="Creators selected" value={String(creatorCounts.selected)} />
        </div>
      </section>

      {/* 2. Campaign performance */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">2. Campaign performance</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Views" value={formatMetric(performance.views)} />
          <StatCard label="Reach" value={formatMetric(performance.reach)} />
          <StatCard label="Engagements" value={formatMetric(performance.engagements)} />
          <StatCard label="Engagement rate" value={formatMetricRate(performance.engagement_rate)} />
        </div>
      </section>

      {/* 3. Creator performance */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">3. Creator performance</h2>
        <CreatorPerformanceTable rows={creatorPerformance} />
      </section>

      {/* 4. Deliverable performance — every deliverable/Story instance individually, never collapsed */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
          4. Deliverable performance <span className="normal-case text-ink-soft/70">({trackerItems.length} tracked individually)</span>
        </h2>
        <DeliverablePerformanceTable items={trackerItems} />
      </section>

      {/* 5. Platform breakdown */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">5. Platform breakdown</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="p-3">Platform</th>
                <th className="p-3">Deliverables</th>
                <th className="p-3">Views</th>
                <th className="p-3">Engagements</th>
                <th className="p-3">Eng. rate</th>
              </tr>
            </thead>
            <tbody>
              {byPlatform.map((p) => (
                <tr key={p.platform} className="border-b border-line last:border-0">
                  <td className="p-3 text-ink">{PLATFORM_LABEL[p.platform]}</td>
                  <td className="p-3 text-ink-soft">{p.count}</td>
                  <td className="p-3 text-ink-soft">{formatMetric(p.metrics.views)}</td>
                  <td className="p-3 text-ink-soft">{formatMetric(p.metrics.engagements)}</td>
                  <td className="p-3 text-ink-soft">{formatMetricRate(p.metrics.engagement_rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. Story evidence */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
          6. Story evidence <span className="normal-case text-ink-soft/70">(a Story is never penalized for lacking a public URL)</span>
        </h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="p-3">Creator</th>
                <th className="p-3">Story</th>
                <th className="p-3">Evidence</th>
                <th className="p-3">Public URL</th>
                <th className="p-3">Completeness</th>
              </tr>
            </thead>
            <tbody>
              {storyRows.length === 0 ? (
                <tr>
                  <td className="p-3 text-ink-soft" colSpan={5}>
                    No Story deliverables on this campaign.
                  </td>
                </tr>
              ) : (
                storyRows.map(({ creatorName, deliverableId, si }) => (
                  <tr key={si.instance.id} className="border-b border-line last:border-0">
                    <td className="p-3 text-ink-soft">{creatorName}</td>
                    <td className="p-3">
                      <Link href={`/campaigns/${id}/content/${deliverableId}`} className="underline text-ink">
                        Story #{si.instance.sequence_number}
                      </Link>
                    </td>
                    <td className="p-3 text-ink-soft">{si.evidence.length > 0 ? `${si.evidence.length} file(s)` : "None"}</td>
                    <td className="p-3 text-ink-soft">{si.instance.content_url ? "Yes" : "Not required"}</td>
                    <td className="p-3">
                      <span className={`badge ${COMPLETENESS_STYLE[si.completeness]}`}>{COMPLETENESS_LABEL[si.completeness]}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. Evidence completeness */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
          7. Evidence completeness <span className="normal-case text-ink-soft/70">({evidenceCompletePercent}%)</span>
        </h2>
        {missingEvidence.length === 0 ? (
          <p className="text-sm text-status-success">Every tracked item has evidence on file.</p>
        ) : (
          <MissingList items={missingEvidence} campaignId={id} />
        )}
      </section>

      {/* 8. Metrics completeness */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
          8. Metrics completeness <span className="normal-case text-ink-soft/70">({metricsCompletePercent}%)</span>
        </h2>
        {missingMetrics.length === 0 ? (
          <p className="text-sm text-status-success">Every tracked item has at least one metric snapshot.</p>
        ) : (
          <MissingList items={missingMetrics} campaignId={id} />
        )}
      </section>

      {/* 9. Report readiness */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
          9. Report readiness <span className="normal-case text-ink-soft/70">({readiness.readinessPercent}%)</span>
        </h2>
        {readiness.blockers.length === 0 ? (
          <p className="text-sm text-status-success">This report is complete — nothing is blocking it.</p>
        ) : (
          <ul className="card divide-y divide-line text-sm">
            {readiness.blockers.map((b) => (
              <li key={b} className="px-4 py-2 text-ink-soft">
                {b}
              </li>
            ))}
          </ul>
        )}
        {budget.warnings.length > 0 ? (
          <div className="mt-3 space-y-1">
            {budget.warnings.map((w) => (
              <p key={w} className="text-xs text-status-warning">
                ⚠ {w}
              </p>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-soft capitalize">{label}</dt>
      <dd className="mt-0.5 text-ink capitalize">{value}</dd>
    </div>
  );
}

function MissingList({ items, campaignId }: { items: ReturnType<typeof getTrackerItems>; campaignId: string }) {
  return (
    <ul className="card divide-y divide-line text-sm">
      {items.map((item) => (
        <li key={item.key} className="flex items-center justify-between px-4 py-2">
          <Link href={`/campaigns/${campaignId}/content/${item.deliverableId}`} className="underline text-ink">
            {item.creatorName} — {item.title || CONTENT_TYPE_LABEL[item.contentType]}
            {item.isStory && item.sequenceNumber ? ` (Story #${item.sequenceNumber})` : ""}
          </Link>
        </li>
      ))}
    </ul>
  );
}
