import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { globalSearch } from "@/lib/global-search";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q ?? "";
  const results = query.trim().length >= 2 ? await globalSearch(query) : null;

  const totalResults = results
    ? results.campaigns.length + results.creators.length + results.deliverables.length + results.contentPosts.length + results.socialAccounts.length
    : 0;

  return (
    <div>
      <PageHeader title="Search" description={query ? `Results for "${query}"` : "Type at least 2 characters to search."} />

      {!results ? (
        <EmptyState icon={Search} title="Type to search" description="Search campaigns, creators, deliverables, content posts, usernames, URLs, and platform post IDs." />
      ) : totalResults === 0 ? (
        <EmptyState icon={Search} title="No results" description="Try a different search term." />
      ) : (
        <div className="space-y-6">
          {results.campaigns.length > 0 ? (
            <ResultSection title="Campaigns">
              {results.campaigns.map((r) => (
                <ResultRow key={r.id} href={`/campaigns/${r.id}`} name={r.name} subtitle={r.subtitle} />
              ))}
            </ResultSection>
          ) : null}

          {results.creators.length > 0 ? (
            <ResultSection title="Creators">
              {results.creators.map((r) => (
                <ResultRow key={r.id} href={`/creators/${r.id}`} name={r.name} subtitle={r.subtitle} />
              ))}
            </ResultSection>
          ) : null}

          {results.deliverables.length > 0 ? (
            <ResultSection title="Deliverables">
              {results.deliverables.map((r) => (
                <ResultRow key={r.id} href={`/campaigns/${r.campaignId}/content/${r.id}`} name={r.name} subtitle={r.subtitle} />
              ))}
            </ResultSection>
          ) : null}

          {results.contentPosts.length > 0 ? (
            <ResultSection title="Content posts">
              {results.contentPosts.map((r) => (
                <ResultRow
                  key={r.id}
                  href={r.deliverableId ? `/campaigns/${r.campaignId}/content/${r.deliverableId}` : `/campaigns/${r.campaignId}`}
                  name={r.name}
                  subtitle={r.subtitle}
                />
              ))}
            </ResultSection>
          ) : null}

          {results.socialAccounts.length > 0 ? (
            <ResultSection title="Social accounts">
              {results.socialAccounts.map((r) => (
                <ResultRow key={r.id} href={`/creators/${r.creatorId}`} name={r.name} subtitle={r.subtitle} />
              ))}
            </ResultSection>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">{title}</h2>
      <ul className="card divide-y divide-line">{children}</ul>
    </section>
  );
}

function ResultRow({ href, name, subtitle }: { href: string; name: string; subtitle: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-paper">
        <span className="truncate text-ink">{name}</span>
        <span className="ml-3 shrink-0 truncate text-xs text-ink-soft">{subtitle}</span>
      </Link>
    </li>
  );
}
