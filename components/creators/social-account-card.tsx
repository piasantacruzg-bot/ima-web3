import type { SocialAccount } from "@/types/database";
import { formatCompactNumber, formatPercent, formatDateTime } from "@/lib/format";
import { PLATFORM_ICON } from "@/components/platform-icon";

export function SocialAccountCard({ account }: { account: SocialAccount }) {
  const Icon = PLATFORM_ICON[account.platform];
  const connected = account.oauth_status === "connected";

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
        <span
          className={`badge ${
            connected
              ? "border-status-success/30 text-status-success"
              : account.oauth_status === "expired" || account.oauth_status === "revoked"
                ? "border-status-warning/30 text-status-warning"
                : account.oauth_status === "error"
                  ? "border-status-danger/30 text-status-danger"
                  : "border-line text-ink-soft"
          }`}
        >
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-3 text-sm">
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
      <div className="grid grid-cols-3 gap-3 border-t border-line pt-3 text-xs">
        <div>
          <p className="text-ink-soft">API</p>
          <p className="text-ink">{connected ? "Connected" : "Not connected — manual tracking enabled"}</p>
        </div>
        <div>
          <p className="text-ink-soft">Last sync</p>
          <p className="text-ink">{account.last_synced_at ? formatDateTime(account.last_synced_at) : "Never"}</p>
        </div>
        <div>
          <p className="text-ink-soft">Content sync</p>
          <p className="text-ink">{connected ? "Active" : "Manual"}</p>
        </div>
      </div>
    </div>
  );
}
