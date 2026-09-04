import { Instagram, Music2, Youtube, Twitter } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

const INTEGRATIONS = [
  {
    platform: "Instagram / Meta",
    icon: Instagram,
    status: "Not connected",
    note: "Requires a Meta developer app, Instagram professional account, and Graph API permissions (business_basic, business_manage_comments, business_content). Architecture and OAuth flow ship in Phase 6.",
  },
  {
    platform: "TikTok",
    icon: Music2,
    status: "Not connected",
    note: "Requires TikTok for Developers app approval and Content Posting / Display API scopes. Ships in Phase 6.",
  },
  {
    platform: "X",
    icon: Twitter,
    status: "Not connected",
    note: "Requires an X API app with elevated access for post metrics. Ships in Phase 6.",
  },
  {
    platform: "YouTube",
    icon: Youtube,
    status: "Not connected",
    note: "Requires a Google Cloud project with YouTube Data API v3 enabled and OAuth consent. Ships in Phase 6.",
  },
] as const;

export default function IntegrationsPage() {
  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Official social platform APIs. No integration here fabricates data — where an API can't provide a metric, the app falls back to manual entry."
      />
      <div className="grid grid-cols-2 gap-4">
        {INTEGRATIONS.map(({ platform, icon: Icon, status, note }) => (
          <div key={platform} className="card p-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon size={18} strokeWidth={1.75} className="text-ink-soft" />
                <p className="text-sm font-medium text-ink">{platform}</p>
              </div>
              <span className="badge border-line text-ink-soft">{status}</span>
            </div>
            <p className="text-sm text-ink-soft">{note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
