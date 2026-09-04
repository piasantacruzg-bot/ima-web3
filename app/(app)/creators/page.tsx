import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { CreatorFilters } from "@/components/creators/creator-filters";
import { CreatorsListClient } from "@/components/creators/creators-list-client";
import { getCreators, getCreatorFilterOptions, type CreatorSortKey } from "@/lib/creators";
import { resolveCreatorAvatarUrls } from "@/lib/creator-avatar";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { CreatorStatus, CreatorType, SocialPlatform } from "@/types/database";

interface CreatorsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CreatorsPage({ searchParams }: CreatorsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const user = await getCurrentUser();
  const supabase = await createClient();

  const [{ creators, total, pageSize }, filterOptions, savedFiltersResult] = await Promise.all([
    getCreators({
      filters: {
        search: params.q,
        platform: params.platform as SocialPlatform | undefined,
        country: params.country,
        category: params.category,
        niche: params.niche,
        tag: params.tag,
        creatorType: params.type as CreatorType | undefined,
        status: params.status as CreatorStatus | undefined,
        minFollowers: params.minFollowers ? Number(params.minFollowers) : undefined,
        maxFollowers: params.maxFollowers ? Number(params.maxFollowers) : undefined,
        minEngagement: params.minEngagement ? Number(params.minEngagement) : undefined,
        maxEngagement: params.maxEngagement ? Number(params.maxEngagement) : undefined,
        minBrandFit: params.minBrandFit ? Number(params.minBrandFit) : undefined,
        maxBrandFit: params.maxBrandFit ? Number(params.maxBrandFit) : undefined,
        minRating: params.minRating ? Number(params.minRating) : undefined,
        maxRating: params.maxRating ? Number(params.maxRating) : undefined,
        includeArchived: params.archived === "1",
      },
      sort: (params.sort as CreatorSortKey) || "recently_added",
      page,
    }),
    getCreatorFilterOptions(),
    user
      ? supabase.from("saved_creator_filters").select("*").eq("user_id", user.id).order("name")
      : Promise.resolve({ data: [] }),
  ]);

  const creatorsWithAvatars = await resolveCreatorAvatarUrls(creators);
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
        tags={filterOptions.tags}
        savedFilters={savedFiltersResult.data ?? []}
      />

      {creatorsWithAvatars.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No creators match these filters"
          description="Try removing one or more filters, or add a new creator to the database."
        />
      ) : (
        <>
          <CreatorsListClient creators={creatorsWithAvatars} />
          <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}
    </div>
  );
}
