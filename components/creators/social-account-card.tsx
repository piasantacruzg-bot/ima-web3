import { Instagram, Music2, Youtube, Twitter, Facebook, Link2 } from "lucide-react";
import type { SocialAccount } from "@/types/database";
import { formatCompactNumber, formatPercent } from "@/lib/format";

const PLATFORM_ICON = {
  instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
  x: Twitter,
  facebook: Facebook,
  other: Link2,
} as const;

export function SocialAccountCard({ account }: { account: SocialAccount }) {
  const Icon = PLATFORM_ICON[account.platform];

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} strokeWidth={1.75} className="text-ink-soft" />
          <a
            href={account.profile_url ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-ink hover:underline"
          >
            @{account.username}
          </a>
        </div>
        <span className="badge border-line text-ink-soft">
          {account.oauth_status === "connected" ? "Connected" : "Not connected"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-ink-soft">Followers</p>
          <p className="text-ink">{formatCompactNumber(account.followers)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-soft">Engagement</p>
          <p className="text-ink">{formatPercent(account.engagement_rate)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-soft">Avg. views</p>
          <p className="text-ink">{formatCompactNumber(account.average_views)}</p>
        </div>
      </div>
    </div>
  );
}
