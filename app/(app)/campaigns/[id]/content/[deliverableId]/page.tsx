import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getDeliverableDetail } from "@/lib/execution";
import { createClient } from "@/lib/supabase/server";
import { CONTENT_TYPE_LABEL, COMPLETENESS_LABEL, COMPLETENESS_STYLE } from "@/lib/content-labels";
import { PlatformIcon } from "@/components/platform-icon";
import { StatusControl } from "@/components/content/status-control";
import { PublishDeliverableForm, PublishStoryForm } from "@/components/content/publish-forms";
import { EvidencePanel, type EvidenceRow } from "@/components/content/evidence-panel";
import { MetricsPanel } from "@/components/content/metrics-panel";
import { SubmissionsPanel } from "@/components/content/submissions-panel";
import { formatDate, formatMetric, formatMetricRate } from "@/lib/format";
import type { ContentEvidence, ContentMetrics } from "@/types/database";

async function resolveEvidence(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: ContentEvidence[]
): Promise<EvidenceRow[]> {
  return Promise.all(
    rows.map(async (ev) => {
      let signedUrl: string | null = null;
      if (ev.storage_path) {
        const { data } = await supabase.storage.from("content-evidence").createSignedUrl(ev.storage_path, 3600);
        signedUrl = data?.signedUrl ?? null;
      }
      return {
        id: ev.id,
        evidenceType: ev.evidence_type,
        fileUrl: ev.file_url,
        screenshotUrl: ev.screenshot_url,
        driveUrl: ev.drive_url,
        filename: ev.filename,
        signedUrl,
        uploadedAt: ev.uploaded_at,
        notes: ev.notes,
      };
    })
  );
}

export default async function DeliverableDetailPage({
  params,
}: {
  params: Promise<{ id: string; deliverableId: string }>;
}) {
  const { id: campaignId, deliverableId } = await params;
  const detail = await getDeliverableDetail(deliverableId);
  if (!detail || detail.deliverable.campaign_id !== campaignId) notFound();

  const { deliverable, creator, campaign, execution } = detail;
  const supabase = await createClient();

  return (
    <div className="space-y-6">
      <PageHeader
        title={deliverable.title || CONTENT_TYPE_LABEL[deliverable.content_type]}
        description={
          <>
            <Link href={`/campaigns/${campaign.id}`} className="underline">
              {campaign.campaign_name}
            </Link>
            {" · "}
            <Link href={`/creators/${creator.id}`} className="underline">
              {creator.display_name}
            </Link>
          </>
        }
        actions={
          <span className="flex items-center gap-1.5 text-sm text-ink-soft">
            <PlatformIcon platform={deliverable.platform} size={15} />
            {CONTENT_TYPE_LABEL[deliverable.content_type]}
          </span>
        }
      />

      <section className="card grid grid-cols-2 gap-4 p-5 text-sm md:grid-cols-4">
        <Field label="Due date" value={formatDate(deliverable.due_date)} />
        <Field label="Usage rights" value={deliverable.usage_rights ?? "—"} />
        <Field label="Paid media rights" value={deliverable.paid_media_rights ? "Yes" : "No"} />
        <Field label="Exclusivity" value={deliverable.exclusivity ?? "—"} />
        {deliverable.instructions ? (
          <div className="col-span-2 md:col-span-4">
            <dt className="text-xs text-ink-soft">Instructions</dt>
            <dd className="mt-0.5 text-ink">{deliverable.instructions}</dd>
          </div>
        ) : null}
      </section>

      {execution.isStory ? (
        <StoryDetail deliverableId={deliverable.id} execution={execution} supabase={supabase} submissions={detail.submissions} />
      ) : (
        <RegularDetail deliverable={deliverable} execution={execution} supabase={supabase} metricHistory={detail.metricHistory} submissions={detail.submissions} />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  );
}

async function RegularDetail({
  deliverable,
  execution,
  supabase,
  metricHistory,
  submissions,
}: {
  deliverable: import("@/types/database").Deliverable;
  execution: import("@/lib/execution").DeliverableExecutionRow;
  supabase: Awaited<ReturnType<typeof createClient>>;
  metricHistory: ContentMetrics[];
  submissions: import("@/types/database").ContentSubmission[];
}) {
  const evidence = await resolveEvidence(supabase, execution.evidence);
  const metricParent = execution.contentPost
    ? { contentPostId: execution.contentPost.id }
    : { deliverableId: deliverable.id };

  return (
    <>
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ink-soft">Status</h2>
        </div>
        <StatusControl kind="deliverable" id={deliverable.id} currentStatus={deliverable.status} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Publication</h2>
        {execution.contentPost ? (
          <div className="text-sm">
            <a href={execution.contentPost.post_url} target="_blank" rel="noreferrer" className="underline text-ink">
              {execution.contentPost.post_url}
            </a>
            {execution.contentPost.caption ? <p className="mt-1 text-ink-soft">{execution.contentPost.caption}</p> : null}
            <p className="mt-1 text-xs text-ink-soft">Published {formatDate(execution.contentPost.published_at)}</p>
          </div>
        ) : (
          <PublishDeliverableForm deliverableId={deliverable.id} />
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Draft &amp; review</h2>
        <SubmissionsPanel deliverableId={deliverable.id} submissions={submissions} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Evidence</h2>
        <EvidencePanel evidence={evidence} deliverableId={deliverable.id} contentPostId={execution.contentPost?.id} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Metrics</h2>
        <MetricsPanel history={metricHistory} {...metricParent} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">API status</h2>
        <ApiStatusBlock contentPost={execution.contentPost} latestMetric={metricHistory[metricHistory.length - 1] ?? null} />
      </section>
    </>
  );
}

function ApiStatusBlock({
  contentPost,
  latestMetric,
}: {
  contentPost: import("@/types/database").ContentPost | null;
  latestMetric: ContentMetrics | null;
}) {
  const isApiSourced = latestMetric?.source === "api";
  return (
    <div className="grid grid-cols-3 gap-4 text-sm">
      <div>
        <p className="text-xs text-ink-soft">Metrics source</p>
        <p className="text-ink capitalize">{latestMetric ? latestMetric.source : "No metrics yet"}</p>
      </div>
      <div>
        <p className="text-xs text-ink-soft">Sync status</p>
        <p className="text-ink capitalize">
          {contentPost && isApiSourced ? contentPost.sync_status.replace(/_/g, " ") : "Manual"}
        </p>
      </div>
      <div>
        <p className="text-xs text-ink-soft">Last sync</p>
        <p className="text-ink">{contentPost?.last_synced_at ? formatDate(contentPost.last_synced_at) : "Never"}</p>
      </div>
    </div>
  );
}

async function StoryDetail({
  deliverableId,
  execution,
  supabase,
  submissions,
}: {
  deliverableId: string;
  execution: import("@/lib/execution").DeliverableExecutionRow;
  supabase: Awaited<ReturnType<typeof createClient>>;
  submissions: import("@/types/database").ContentSubmission[];
}) {
  return (
    <>
      <section className="card p-5">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
          Story instances ({execution.storyInstances.length})
        </h2>
        <p className="mb-3 text-xs text-ink-soft">
          Each Story is tracked independently — its own status, evidence, and metric history. None of them share a
          record, and a public URL is never required for one to be complete.
        </p>
        <div className="space-y-4">
          {execution.storyInstances.map((instanceRow, i) => (
            <StoryInstanceCard key={instanceRow.instance.id} index={i + 1} instanceRow={instanceRow} supabase={supabase} />
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Computed totals</h2>
        <p className="mb-3 text-xs text-ink-soft">
          Summed from the instances above — never entered or stored separately.
        </p>
        <div className="grid grid-cols-3 gap-4 text-sm md:grid-cols-6">
          <Field label="Views" value={formatMetric(execution.aggregatedMetrics.views)} />
          <Field label="Reach" value={formatMetric(execution.aggregatedMetrics.reach)} />
          <Field label="Impressions" value={formatMetric(execution.aggregatedMetrics.impressions)} />
          <Field label="Engagements" value={formatMetric(execution.aggregatedMetrics.engagements)} />
          <Field label="Eng. rate" value={formatMetricRate(execution.aggregatedMetrics.engagement_rate)} />
          <Field label="Completeness" value={COMPLETENESS_LABEL[execution.completeness]} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Draft &amp; review</h2>
        <SubmissionsPanel deliverableId={deliverableId} submissions={submissions} />
      </section>
    </>
  );
}

async function StoryInstanceCard({
  index,
  instanceRow,
  supabase,
}: {
  index: number;
  instanceRow: import("@/lib/execution").StoryInstanceExecutionRow;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const { instance, latestMetrics, evidence: rawEvidence, completeness } = instanceRow;
  const evidence = await resolveEvidence(supabase, rawEvidence);
  const { data: history } = await supabase
    .from("content_metrics")
    .select("*")
    .eq("story_instance_id", instance.id)
    .order("captured_at", { ascending: true });

  return (
    <div className="rounded-md border border-line p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink">Story #{index}</span>
        <span className={`badge ${COMPLETENESS_STYLE[completeness]}`}>{COMPLETENESS_LABEL[completeness]}</span>
      </div>

      <div className="mb-3">
        <StatusControl kind="story" id={instance.id} currentStatus={instance.status} />
      </div>

      {instance.content_url ? (
        <a href={instance.content_url} target="_blank" rel="noreferrer" className="mb-3 block text-xs underline text-ink-soft">
          {instance.content_url}
        </a>
      ) : instance.status === "published" ? (
        <p className="mb-3 text-xs text-ink-soft">No public URL — not required for Stories.</p>
      ) : (
        <div className="mb-3">
          <PublishStoryForm storyInstanceId={instance.id} />
        </div>
      )}

      <div className="mb-3 grid grid-cols-4 gap-3 text-xs">
        <Field label="Views" value={formatMetric(latestMetrics?.views)} />
        <Field label="Likes" value={formatMetric(latestMetrics?.likes)} />
        <Field label="Comments" value={formatMetric(latestMetrics?.comments)} />
        <Field label="Eng. rate" value={formatMetricRate(latestMetrics?.engagement_rate)} />
      </div>

      <details className="mb-3">
        <summary className="cursor-pointer text-xs font-medium text-ink-soft">Evidence ({evidence.length})</summary>
        <div className="mt-2">
          <EvidencePanel evidence={evidence} storyInstanceId={instance.id} />
        </div>
      </details>

      <details>
        <summary className="cursor-pointer text-xs font-medium text-ink-soft">Metric history ({history?.length ?? 0})</summary>
        <div className="mt-2">
          <MetricsPanel history={history ?? []} storyInstanceId={instance.id} />
        </div>
      </details>
    </div>
  );
}
