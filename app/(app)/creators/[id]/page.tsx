import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Mail, Phone, MapPin, Star, Archive, RotateCcw, Megaphone, Users } from "lucide-react";
import { getCreatorProfile } from "@/lib/creators";
import { SocialAccountCard } from "@/components/creators/social-account-card";
import { EmptyState } from "@/components/ui/empty-state";
import { NotesSection } from "@/components/creators/notes-section";
import { TagsSection } from "@/components/creators/tags-section";
import { StatusSelect } from "@/components/creators/status-select";
import { DuplicateCheckButton } from "@/components/creators/duplicate-check-button";
import { formatDate } from "@/lib/format";
import {
  restoreCreator,
  archiveCreator,
  changeCreatorStatus,
  addCreatorNote,
  createAndAssignTag,
  removeTagAssignment,
  checkExistingCreatorDuplicates,
} from "@/app/(app)/creators/actions";

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

  const { creator, socialAccounts, campaignHistory, notes, tags, allTags, provenance } = profile;
  const customFieldEntries = Object.entries(creator.custom_fields);
  const boundChangeStatus = changeCreatorStatus.bind(null, creator.id);
  const boundAddNote = addCreatorNote.bind(null, creator.id);
  const boundAddTag = createAndAssignTag.bind(null, creator.id);
  const boundRemoveTag = removeTagAssignment.bind(null, creator.id);
  const boundArchive = archiveCreator.bind(null, creator.id);
  const boundRestore = restoreCreator.bind(null, creator.id);

  return (
    <div>
      {creator.archived_at ? (
        <p className="mb-4 flex items-center justify-between rounded-sm border border-line bg-line-soft px-3 py-2 text-sm text-ink-soft">
          <span>Archived {formatDate(creator.archived_at)}. Hidden from the default creator list.</span>
          <form action={boundRestore}>
            <button type="submit" className="btn-secondary py-1">
              <RotateCcw size={13} strokeWidth={1.75} />
              Restore
            </button>
          </form>
        </p>
      ) : null}
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
            <StatusSelect action={boundChangeStatus} defaultValue={creator.status} />
            {creator.creator_type ? (
              <span className="badge border-line capitalize text-ink-soft">
                {creator.creator_type}
              </span>
            ) : null}
            {creator.status === "do_not_work_with" ? (
              <span className="badge border-status-danger/30 text-status-danger">
                Do not work with
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
            {creator.city || creator.country ? (
              <span className="flex items-center gap-1">
                <MapPin size={14} strokeWidth={1.75} />
                {[creator.city, creator.state_province, creator.country].filter(Boolean).join(", ")}
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
            {creator.brand_fit_score !== null ? (
              <span>Brand fit: {creator.brand_fit_score}/100</span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled
            title="Campaign management ships in Phase 4"
            className="btn-secondary cursor-not-allowed opacity-50"
          >
            <Megaphone size={15} strokeWidth={1.75} />
            Add to Campaign
          </button>
          <DuplicateCheckButton creatorId={creator.id} checkAction={checkExistingCreatorDuplicates} />
          <Link href={`/creators/${creator.id}/edit`} className="btn-secondary">
            <Pencil size={15} strokeWidth={1.75} />
            Edit
          </Link>
          {!creator.archived_at ? (
            <form action={boundArchive}>
              <button type="submit" className="btn-secondary">
                <Archive size={15} strokeWidth={1.75} />
                Archive
              </button>
            </form>
          ) : null}
        </div>
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
                title="No social accounts connected"
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
              Performance
            </h2>
            {socialAccounts.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No campaign performance data yet"
                description="Performance accumulates automatically once this creator joins campaigns (Phase 4+)."
              />
            ) : (
              <div className="card grid grid-cols-4 gap-4 p-4 text-sm">
                {(
                  [
                    ["Followers", socialAccounts.reduce((m, a) => Math.max(m, a.followers ?? 0), 0)],
                    [
                      "Engagement",
                      (
                        socialAccounts.reduce((s, a) => s + (a.engagement_rate ?? 0), 0) /
                        socialAccounts.length
                      ).toFixed(1) + "%",
                    ],
                    ["Avg. views", socialAccounts.reduce((m, a) => Math.max(m, a.average_views ?? 0), 0)],
                    [
                      "Est. reach",
                      socialAccounts.reduce((m, a) => Math.max(m, a.estimated_reach ?? 0), 0),
                    ],
                  ] as [string, number | string][]
                ).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-ink-soft">{label}</p>
                    <p className="text-ink">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
              Campaign history
            </h2>
            {campaignHistory.length === 0 ? (
              <EmptyState icon={Megaphone} title="No campaigns yet" description="No campaigns yet." />
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

          <TagsSection tags={tags} allTags={allTags} addAction={boundAddTag} removeAction={boundRemoveTag} />

          {customFieldEntries.length > 0 ? (
            <section className="card p-4">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
                Additional fields
              </h2>
              <dl className="space-y-2 text-sm">
                {customFieldEntries.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs text-ink-soft">{key}</dt>
                    <dd className="text-ink">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {provenance.length > 0 ? (
            <section className="card p-4">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
                Data source
              </h2>
              <ul className="space-y-2 text-sm">
                {provenance.map((entry, i) => (
                  <li key={`${entry.batchId}-${i}`}>
                    <Link href={`/imports/${entry.batchId}`} className="text-ink underline">
                      {entry.kind === "created" ? "Imported from" : "Updated by"} {entry.sourceFilename}
                    </Link>
                    <p className="text-xs text-ink-soft">{formatDate(entry.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {creator.bio ? (
            <section className="card p-4">
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">Bio</h2>
              <p className="whitespace-pre-wrap text-sm text-ink-soft">{creator.bio}</p>
            </section>
          ) : null}

          <NotesSection notes={notes} addAction={boundAddNote} />
        </div>
      </div>
    </div>
  );
}
