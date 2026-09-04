import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Mail, Phone, MapPin, Star } from "lucide-react";
import { getCreatorProfile } from "@/lib/creators";
import { SocialAccountCard } from "@/components/creators/social-account-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { formatDate } from "@/lib/format";

const STATUS_STYLES: Record<string, string> = {
  prospect: "border-line text-ink-soft",
  approved: "border-status-info/30 text-status-info",
  active: "border-status-success/30 text-status-success",
  inactive: "border-line text-ink-soft",
  do_not_work_with: "border-status-danger/30 text-status-danger",
};

export default async function CreatorProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ warnings?: string }>;
}) {
  const { id } = await params;
  const { warnings } = await searchParams;
  const profile = await getCreatorProfile(id);
  if (!profile) notFound();

  const { creator, socialAccounts, campaignHistory } = profile;

  return (
    <div>
      {warnings ? (
        <p className="mb-4 rounded-sm border border-status-warning/30 bg-status-warning/5 px-3 py-2 text-sm text-status-warning">
          Creator saved, but: {warnings}
        </p>
      ) : null}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl tracking-tight text-ink">
              {creator.display_name}
            </h1>
            <span
              className={`badge capitalize ${STATUS_STYLES[creator.status] ?? "border-line text-ink-soft"}`}
            >
              {creator.status.replace(/_/g, " ")}
            </span>
            {creator.creator_type ? (
              <span className="badge border-line capitalize text-ink-soft">
                {creator.creator_type}
              </span>
            )
              : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
            {creator.city || creator.country ? (
              <span className="flex items-center gap-1">
                <MapPin size={14} strokeWidth={1.75} />
                {[creator.city, creator.country].filter(Boolean).join(", ")}
              </span>
            ) : null}
            {creator.email ? (
              <span className="flex items-center gap-1">
                <Mail size={14} strokeWidth={1.75} />
                {creator.email}
              </span>
            ) : null}
            {creator.phone ? (
              <span className="flex items-center gap-1">
                <Phone size={14} strokeWidth={1.75} />
                {creator.phone}
              </span>
            ) : null}
            {creator.internal_rating ? (
              <span className="flex items-center gap-1">
                <Star size={14} strokeWidth={1.75} />
                {creator.internal_rating}/5
              </span>
            ) : null}
          </div>
        </div>
        <Link href={`/creators/${creator.id}/edit`} className="btn-secondary">
          <Pencil size={15} strokeWidth={1.75} />
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
              Social accounts
            </h2>
            {socialAccounts.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No social accounts yet"
                description="Add Instagram, TikTok, YouTube, X, or Facebook accounts from the edit page."
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {socialAccounts.map((account) => (
                  <SocialAccountCard key={account.id} account={account} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
              Campaign history
            </h2>
            {campaignHistory.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No campaigns yet"
                description="This creator hasn't been added to a campaign."
              />
            ) : (
              <ul className="card divide-y divide-line">
                {campaignHistory.map((row) => (
                  <li
                    key={row.campaign_creator_id}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="text-ink">{row.campaign?.campaign_name ?? "Unknown campaign"}</p>
                      <p className="text-xs text-ink-soft">
                        {row.campaign?.brand_name} · added {formatDate(row.added_at)}
                      </p>
                    </div>
                    <span className="badge border-line capitalize text-ink-soft">
                      {row.status.replace(/_/g, " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-4">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
              Manager / agency
            </h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-ink-soft">Manager</dt>
                <dd className="text-ink">{creator.manager_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Manager email</dt>
                <dd className="text-ink">{creator.manager_email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Agency</dt>
                <dd className="text-ink">{creator.agency_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Rate card notes</dt>
                <dd className="text-ink">{creator.rate_card_notes ?? "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="card p-4">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
              Categories &amp; niches
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {[...creator.categories, ...creator.niches].map((tag) => (
                <span key={tag} className="badge border-line text-ink-soft">
                  {tag}
                </span>
              ))}
              {creator.categories.length === 0 && creator.niches.length === 0 ? (
                <p className="text-sm text-ink-soft">None set</p>
              ) : null}
            </div>
          </section>

          {creator.notes ? (
            <section className="card p-4">
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
                Internal notes
              </h2>
              <p className="whitespace-pre-wrap text-sm text-ink-soft">{creator.notes}</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
