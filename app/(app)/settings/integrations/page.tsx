import Link from "next/link";
import { HardDrive } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PlatformIcon } from "@/components/platform-icon";
import { AccountActions } from "@/components/integrations/account-actions";
import { BulkSyncButton } from "@/components/integrations/bulk-sync-button";
import { getIntegrationSummaries } from "@/lib/integrations-status";
import { isGoogleDriveConfigured } from "@/lib/integrations/google-drive/adapter";
import { PLATFORM_LABEL, INTEGRATION_STATUS_LABEL, INTEGRATION_STATUS_STYLE } from "@/lib/content-labels";
import { formatDateTime } from "@/lib/format";

export default async function IntegrationsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const summaries = await getIntegrationSummaries();
  const driveConfigured = isGoogleDriveConfigured();
  const connectedCount = summaries.reduce((sum, s) => sum + s.connectedAccounts.filter((a) => a.oauthStatus === "connected").length, 0);

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Official platform APIs only. Where a platform's API can't provide a metric, or a connection isn't configured, the app falls back to manual entry — nothing here is ever fabricated."
        actions={<BulkSyncButton connectedCount={connectedCount} />}
      />

      {error ? (
        <div className="mb-4 rounded-sm border border-status-danger/30 bg-status-danger/5 px-4 py-3 text-sm text-status-danger">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        {summaries.map((summary) => (
          <section key={summary.platform} className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={summary.platform} size={18} />
                <p className="text-sm font-medium text-ink">{PLATFORM_LABEL[summary.platform]}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${INTEGRATION_STATUS_STYLE[summary.status]}`}>{INTEGRATION_STATUS_LABEL[summary.status]}</span>
                <a href={`/api/integrations/${summary.platform}/connect`} className="btn-secondary py-1 text-xs">
                  {summary.isConfigured ? "Connect another account" : "Connect"}
                </a>
              </div>
            </div>

            {!summary.isConfigured ? (
              <p className="mb-3 text-xs text-ink-soft">
                Not configured yet — set the {PLATFORM_LABEL[summary.platform]} OAuth environment variables (see
                .env.example) to enable connecting. Until then, all content and metrics for this platform stay
                manual.
              </p>
            ) : null}

            <dl className="mb-3 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <dt className="text-xs text-ink-soft">Last sync</dt>
                <dd className="text-ink">{summary.lastSyncAt ? formatDateTime(summary.lastSyncAt) : "Never"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Permissions</dt>
                <dd className="text-ink">{summary.permissions.length > 0 ? summary.permissions.join(", ") : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Connection owner</dt>
                <dd className="text-ink">{summary.connectionOwners.length > 0 ? summary.connectionOwners.join(", ") : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Sync errors</dt>
                <dd className={summary.syncErrorCount > 0 ? "text-status-danger" : "text-ink"}>{summary.syncErrorCount}</dd>
              </div>
            </dl>

            {summary.connectedAccounts.length === 0 ? (
              <p className="text-xs text-ink-soft">No accounts connected.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                      <th className="p-2">Creator</th>
                      <th className="p-2">Username</th>
                      <th className="p-2">Status</th>
                      <th className="p-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {summary.connectedAccounts.map((account) => (
                      <tr key={account.socialAccountId} className="border-b border-line last:border-0">
                        <td className="p-2">
                          <Link href={`/creators/${account.creatorId}`} className="text-ink underline">
                            {account.creatorName}
                          </Link>
                        </td>
                        <td className="p-2 text-ink-soft">@{account.username}</td>
                        <td className="p-2 text-ink-soft capitalize">{account.oauthStatus.replace(/_/g, " ")}</td>
                        <td className="p-2">
                          <AccountActions socialAccountId={account.socialAccountId} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive size={18} strokeWidth={1.75} className="text-ink-soft" />
              <p className="text-sm font-medium text-ink">Google Drive</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${driveConfigured ? INTEGRATION_STATUS_STYLE.connected : INTEGRATION_STATUS_STYLE.not_connected}`}>
                {driveConfigured ? "Configured" : "Not connected"}
              </span>
              <Link href="/settings/integrations/google-drive" className="btn-secondary py-1 text-xs">
                Manage
              </Link>
            </div>
          </div>
          <p className="text-xs text-ink-soft">
            Used for Story screenshot evidence. Falls back to internal storage automatically when not connected —
            campaign execution never blocks on it.
          </p>
        </section>
      </div>
    </div>
  );
}
