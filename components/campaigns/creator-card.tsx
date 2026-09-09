import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { PlatformIcon } from "@/components/platform-icon";
import { formatCompactNumber, formatPercent } from "@/lib/format";
import type { CreatorCardData } from "@/components/campaigns/creator-card-data";

// "Not available" rather than 0 for a metric the database doesn't have
// (spec section 13) — reuses the app-wide "—" glyph other pages already
// use for missing data, just with the explicit words behind it via title.
function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="text-ink" title={value === "—" ? "Not available" : undefined}>
        {value}
      </p>
    </div>
  );
}

export function CreatorCard({
  data,
  campaignId,
  selected,
  onToggleCompare,
  children,
}: {
  data: CreatorCardData;
  campaignId: string;
  selected?: boolean;
  onToggleCompare?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={`card p-4 ${selected ? "ring-1 ring-ink" : ""}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-line-soft text-sm font-medium text-ink-soft">
            {data.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <Link href={`/campaigns/${campaignId}/creators/${data.creatorId}`} className="font-medium text-ink hover:underline">
              {data.displayName}
            </Link>
            {data.city || data.country ? (
              <p className="flex items-center gap-1 text-xs text-ink-soft">
                <MapPin size={11} strokeWidth={1.75} />
                {[data.city, data.country].filter(Boolean).join(", ")}
              </p>
            ) : null}
          </div>
        </div>
        {data.matchScore !== null ? (
          <span className="badge shrink-0 border-line text-ink">{Math.round(data.matchScore)} match</span>
        ) : null}
      </div>

      {data.eligibilityNote ? (
        <p className="mb-2 rounded-sm bg-status-warning/10 px-2 py-1 text-xs text-status-warning">
          ⚠ {data.eligibilityNote}
        </p>
      ) : null}

      <div className="mb-2 flex flex-wrap gap-1">
        {data.platforms.map((p) => (
          <span key={p} className="rounded-full border border-line p-1 text-ink-soft">
            <PlatformIcon platform={p} size={12} />
          </span>
        ))}
        {data.categories.slice(0, 3).map((c) => (
          <span key={c} className="badge border-line text-ink-soft">
            {c}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-line pt-2 text-sm">
        <Metric label="Followers" value={formatCompactNumber(data.followers)} />
        <Metric label="Engagement" value={formatPercent(data.engagementRate)} />
        <Metric label="Avg. views" value={formatCompactNumber(data.averageViews)} />
        <Metric label="Brand fit" value={data.brandFitScore !== null ? `${data.brandFitScore}/100` : "—"} />
        <Metric
          label="Rating"
          value={
            data.internalRating !== null ? (
              <span className="flex items-center gap-0.5">
                {data.internalRating}
                <Star size={11} strokeWidth={1.75} />
              </span>
            ) : (
              "—"
            )
          }
        />
        <Metric label="Campaigns" value={String(data.previousCampaignCount)} />
      </div>

      {data.matchReasons.length > 0 ? (
        <ul className="mt-2 list-inside list-disc text-xs text-ink-soft">
          {data.matchReasons.slice(0, 3).map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}

      {onToggleCompare ? (
        <label className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft">
          <input type="checkbox" checked={Boolean(selected)} onChange={onToggleCompare} />
          Compare
        </label>
      ) : null}

      {children}
    </div>
  );
}
