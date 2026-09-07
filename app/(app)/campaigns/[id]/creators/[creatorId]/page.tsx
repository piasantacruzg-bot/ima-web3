import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PlatformIcon } from "@/components/platform-icon";
import { CampaignCreatorEditor } from "@/components/campaigns/campaign-creator-editor";
import { createClient } from "@/lib/supabase/server";
import { formatCompactNumber, formatCurrency, formatDate, formatPercent } from "@/lib/format";

export default async function CampaignCreatorDetailPage({
  params,
}: {
  params: Promise<{ id: string; creatorId: string }>;
}) {
  const { id, creatorId } = await params;
  const supabase = await createClient();

  const [
    { data: campaign },
    { data: campaignCreator },
    { data: creator },
    { data: socialAccounts },
    { data: deliverables },
    { data: otherCampaigns },
  ] = await Promise.all([
    supabase.from("campaigns").select("campaign_name").eq("id", id).maybeSingle(),
    supabase.from("campaign_creators").select("*").eq("campaign_id", id).eq("creator_id", creatorId).maybeSingle(),
    supabase.from("creators").select("*").eq("id", creatorId).maybeSingle(),
    supabase.from("social_accounts").select("*").eq("creator_id", creatorId),
    supabase.from("deliverables").select("*").eq("campaign_id", id).eq("creator_id", creatorId),
    supabase
      .from("campaign_creators")
      .select("id, status, negotiated_fee, campaigns(id, campaign_name, status)")
      .eq("creator_id", creatorId)
      .neq("campaign_id", id),
  ]);

  if (!campaign || !campaignCreator || !creator) notFound();

  return (
    <div>
      <Link href={`/campaigns/${id}`} className="mb-2 inline-block text-xs text-ink-soft underline">
        ← {campaign.campaign_name}
      </Link>
      <PageHeader
        title={creator.display_name}
        description={`In ${campaign.campaign_name}`}
        actions={
          <Link href={`/creators/${creatorId}`} className="btn-secondary">
            View full creator profile
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <section className="card p-4">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Creator summary</h2>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
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
            </div>
            <div className="flex flex-wrap gap-1.5">
              {creator.categories.map((c) => (
                <span key={c} className="badge border-line text-ink-soft">
                  {c}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Social accounts</h2>
            <div className="grid grid-cols-2 gap-3">
              {(socialAccounts ?? []).map((a) => (
                <div key={a.id} className="card flex items-center justify-between p-3 text-sm">
                  <span className="flex items-center gap-2">
                    <PlatformIcon platform={a.platform} />@{a.username}
                  </span>
                  <span className="text-ink-soft">
                    {formatCompactNumber(a.followers)} · {formatPercent(a.engagement_rate)}
                  </span>
                </div>
              ))}
              {(socialAccounts ?? []).length === 0 ? <p className="text-sm text-ink-soft">No social accounts on record.</p> : null}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
              Match score {campaignCreator.match_score !== null ? `— ${Math.round(campaignCreator.match_score)}` : ""}
            </h2>
            {campaignCreator.match_reasons.length > 0 ? (
              <ul className="card list-inside list-disc p-4 text-sm text-ink-soft">
                {campaignCreator.match_reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">This creator was added manually — no match calculation on record.</p>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Deliverables</h2>
            {(deliverables ?? []).length === 0 ? (
              <p className="text-sm text-ink-soft">
                No deliverables yet — they&apos;re generated automatically once this creator is Selected.
              </p>
            ) : (
              <ul className="card divide-y divide-line text-sm">
                {(deliverables ?? []).map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-4 py-2">
                    <span className="capitalize text-ink">
                      {d.quantity}x {d.content_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-ink-soft">
                      {formatDate(d.due_date)} · {d.status.replace(/_/g, " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
              Previous campaign history
            </h2>
            {(otherCampaigns ?? []).length === 0 ? (
              <p className="text-sm text-ink-soft">No other campaigns on record for this creator.</p>
            ) : (
              <ul className="card divide-y divide-line text-sm">
                {(otherCampaigns ?? []).map((row) => {
                  const c = (row as unknown as { campaigns: { id: string; campaign_name: string } | null }).campaigns;
                  return (
                    <li key={row.id} className="flex items-center justify-between px-4 py-2">
                      <Link href={c ? `/campaigns/${c.id}` : "#"} className="text-ink underline">
                        {c?.campaign_name ?? "Unknown campaign"}
                      </Link>
                      <span className="text-ink-soft capitalize">
                        {row.status.replace(/_/g, " ")}
                        {row.negotiated_fee ? ` · ${formatCurrency(row.negotiated_fee)}` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {creator.notes ? (
            <section className="card p-4">
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
                Internal creator notes <span className="normal-case text-ink-soft/70">(permanent, on the creator profile)</span>
              </h2>
              <p className="whitespace-pre-wrap text-sm text-ink-soft">{creator.notes}</p>
            </section>
          ) : null}
        </div>

        <div>
          <section className="card p-4">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Campaign relationship</h2>
            <CampaignCreatorEditor campaignId={id} creatorId={creatorId} campaignCreator={campaignCreator} />
          </section>
        </div>
      </div>
    </div>
  );
}
