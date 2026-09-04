import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { CreatorFilters } from "@/components/creators/creator-filters";
import { CreatorsTable } from "@/components/creators/creators-table";
import { getCreators, getCreatorFilterOptions, type CreatorSortKey } from "@/lib/creators";
import type { CreatorStatus, CreatorType, SocialPlatform } from "@/types/database";

interface CreatorsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CreatorsPage({ searchParams }: CreatorsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [{ creators, total, pageSize }, filterOptions] = await Promise.all([
    getCreators({
      filters: {
        search: params.q,
        platform: params.platform as SocialPlatform | undefined,
        country: params.country,
        category: params.category,
        niche: params.niche,
        creatorType: params.type as CreatorType | undefined,
        status: params.status as CreatorStatus | undefined,
      },
      sort: (params.sort as CreatorSortKey) || "recently_added",
      page,
    }),
    getCreatorFilterOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function buildHref(targetPage: number) {
    const next = new URLSearchParams(params as Record<string, string>);
    next.set("page", String(targetPage));
    return `/creators?${next.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title="Creators"
        description={`${total} creator${total === 1 ? "" : "s"} in the database`}
        actions={
          <Link href="/creators/new" className="btn-primary">
            <UserPlus size={15} strokeWidth={1.75} />
            Add Creator
          </Link>
        }
      />

      <CreatorFilters
        countries={filterOptions.countries}
        categories={filterOptions.categories}
        niches={filterOptions.niches}
      />

      {creators.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No creators match these filters"
          description="Try clearing a filter, or add a new creator to the database."
        />
      ) : (
        <>
          <CreatorsTable creators={creators} />
          <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}
    </div>
  );
}
