import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { CampaignFilters } from "@/components/campaigns/campaign-filters";
import { CampaignRowActions } from "@/components/campaigns/campaign-row-actions";
import { getCampaigns, type CampaignSortKey } from "@/lib/campaigns";
import { formatCurrency, formatDate } from "@/lib/format";
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

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { campaigns, total, pageSize } = await getCampaigns({
    filters: {
      search: params.q,
      status: params.status as CampaignStatus | undefined,
      includeArchived: params.archived === "1",
    },
    sort: (params.sort as CampaignSortKey) || "recently_added",
    page,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function buildHref(targetPage: number) {
    const next = new URLSearchParams(params as Record<string, string>);
    next.set("page", String(targetPage));
    return `/campaigns?${next.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description={`${total} campaign${total === 1 ? "" : "s"}`}
        actions={
          <Link href="/campaigns/new" className="btn-primary">
            <Plus size={15} strokeWidth={1.75} />
            New campaign
          </Link>
        }
      />

      <CampaignFilters />

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns match these filters"
          description="Try removing a filter, or create a new campaign."
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                    <th className="p-3">Campaign</th>
                    <th className="p-3">Client / Brand</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Dates</th>
                    <th className="p-3">Budget</th>
                    <th className="p-3">Creators</th>
                    <th className="p-3">Deliverables</th>
                    <th className="p-3">Updated</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-b border-line last:border-0 hover:bg-paper">
                      <td className="p-3">
                        <Link href={`/campaigns/${c.id}`} className="font-medium text-ink underline">
                          {c.campaign_name}
                        </Link>
                        {c.archived_at ? (
                          <span className="badge ml-2 border-line text-ink-soft">Archived</span>
                        ) : null}
                      </td>
                      <td className="p-3 text-ink-soft">
                        {c.client_name}
                        {c.brand_name ? ` · ${c.brand_name}` : ""}
                      </td>
                      <td className="p-3">
                        <span className={`badge capitalize ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                      </td>
                      <td className="p-3 text-ink-soft">
                        {formatDate(c.start_date)} – {formatDate(c.end_date)}
                      </td>
                      <td className="p-3 text-ink-soft">{formatCurrency(c.budget)}</td>
                      <td className="p-3 text-ink-soft">
                        {c.selected_creator_count} / {c.creator_count} selected
                      </td>
                      <td className="p-3 text-ink-soft">{c.deliverable_count}</td>
                      <td className="p-3 text-ink-soft">{formatDate(c.updated_at)}</td>
                      <td className="p-3">
                        <CampaignRowActions campaignId={c.id} isArchived={Boolean(c.archived_at)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}
    </div>
  );
}
