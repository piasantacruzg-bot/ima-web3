import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { isGoogleDriveConfigured, buildDriveFolderPath } from "@/lib/integrations/google-drive/adapter";

export default async function GoogleDriveSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const configured = isGoogleDriveConfigured();
  const examplePath = buildDriveFolderPath({ clientName: "Meridian Yachts", campaignName: "Luxury Miami Launch", creatorName: "Valentina Cruz" });

  return (
    <div>
      <PageHeader
        title="Google Drive"
        description="Story evidence storage. Falls back to internal storage automatically when Drive isn't connected — campaign execution never blocks on it."
        actions={
          <Link href="/settings/integrations" className="btn-secondary">
            Back to Integrations
          </Link>
        }
      />

      {error ? (
        <div className="mb-4 rounded-sm border border-status-danger/30 bg-status-danger/5 px-4 py-3 text-sm text-status-danger">
          {error}
        </div>
      ) : null}

      <section className="card mb-6 p-5">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Connection</h2>
        {configured ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink">GOOGLE_DRIVE_CLIENT_ID / GOOGLE_DRIVE_CLIENT_SECRET are set.</p>
            <a href="/api/integrations/google-drive/connect" className="btn-secondary py-1 text-xs">
              Connect
            </a>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">
            Not configured. Set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and GOOGLE_DRIVE_REDIRECT_URI
            (see .env.example) to enable connecting. Story evidence uploads use internal storage until then.
          </p>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Folder structure</h2>
        <p className="mb-3 text-sm text-ink-soft">
          Configurable, not hardcoded — every Story screenshot uploaded through Drive is filed under:
        </p>
        <p className="rounded-sm border border-line bg-paper px-3 py-2 font-mono text-sm text-ink">
          {examplePath.join(" / ")}
        </p>
      </section>
    </div>
  );
}
