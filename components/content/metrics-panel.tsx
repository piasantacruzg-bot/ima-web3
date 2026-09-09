"use client";

import { useState, useTransition } from "react";
import { addMetricSnapshot } from "@/app/(app)/content/actions";
import { formatDateTime, formatMetric, formatMetricRate } from "@/lib/format";
import type { ContentMetrics, MetricSource } from "@/types/database";

const SOURCES: MetricSource[] = ["manual", "api", "screenshot", "imported", "url"];

const NUMERIC_FIELDS: { key: keyof FormState; label: string }[] = [
  { key: "views", label: "Views" },
  { key: "reach", label: "Reach" },
  { key: "impressions", label: "Impressions" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "reposts", label: "Reposts" },
  { key: "saves", label: "Saves" },
  { key: "clicks", label: "Clicks" },
  { key: "replies", label: "Replies" },
  { key: "videoStarts", label: "Video starts" },
  { key: "threeSecondViews", label: "3-second views" },
  { key: "averageWatchTime", label: "Avg. watch time (s)" },
  { key: "stickerTaps", label: "Sticker taps" },
  { key: "forwardTaps", label: "Forward taps" },
  { key: "backTaps", label: "Back taps" },
  { key: "exits", label: "Exits" },
  { key: "followers", label: "Followers (for rate only)" },
];

type FormState = Record<
  | "views"
  | "reach"
  | "impressions"
  | "likes"
  | "comments"
  | "shares"
  | "reposts"
  | "saves"
  | "clicks"
  | "replies"
  | "videoStarts"
  | "threeSecondViews"
  | "averageWatchTime"
  | "stickerTaps"
  | "forwardTaps"
  | "backTaps"
  | "exits"
  | "followers",
  string
>;

const EMPTY_FORM: FormState = Object.fromEntries(NUMERIC_FIELDS.map((f) => [f.key, ""])) as FormState;

// Every capture is a brand-new content_metrics row (spec section 10) — the
// history list below shows every one of them, oldest first, so a second
// snapshot is always visibly additive rather than replacing the first.
export function MetricsPanel({
  history,
  contentPostId,
  storyInstanceId,
  deliverableId,
}: {
  history: ContentMetrics[];
  contentPostId?: string;
  storyInstanceId?: string;
  deliverableId?: string;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [source, setSource] = useState<MetricSource>("manual");
  const [isEstimated, setIsEstimated] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toNumberOrNull(value: string): number | null {
    if (value.trim() === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await addMetricSnapshot({
        contentPostId,
        storyInstanceId,
        deliverableId,
        source,
        isEstimated,
        views: toNumberOrNull(form.views),
        reach: toNumberOrNull(form.reach),
        impressions: toNumberOrNull(form.impressions),
        likes: toNumberOrNull(form.likes),
        comments: toNumberOrNull(form.comments),
        shares: toNumberOrNull(form.shares),
        reposts: toNumberOrNull(form.reposts),
        saves: toNumberOrNull(form.saves),
        clicks: toNumberOrNull(form.clicks),
        replies: toNumberOrNull(form.replies),
        videoStarts: toNumberOrNull(form.videoStarts),
        threeSecondViews: toNumberOrNull(form.threeSecondViews),
        averageWatchTime: toNumberOrNull(form.averageWatchTime),
        stickerTaps: toNumberOrNull(form.stickerTaps),
        forwardTaps: toNumberOrNull(form.forwardTaps),
        backTaps: toNumberOrNull(form.backTaps),
        exits: toNumberOrNull(form.exits),
        followers: toNumberOrNull(form.followers),
      });
      if ("error" in res) setError(res.error);
      else {
        setForm(EMPTY_FORM);
        setIsEstimated(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      {history.length === 0 ? (
        <p className="text-xs text-ink-soft">No metrics captured yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line text-left uppercase tracking-wide text-ink-soft">
                <th className="p-2">Captured</th>
                <th className="p-2">Source</th>
                <th className="p-2">Views</th>
                <th className="p-2">Reach</th>
                <th className="p-2">Impr.</th>
                <th className="p-2">Likes</th>
                <th className="p-2">Comments</th>
                <th className="p-2">Shares</th>
                <th className="p-2">Saves</th>
                <th className="p-2">Engagements</th>
                <th className="p-2">Eng. rate</th>
                <th className="p-2">Estimated</th>
              </tr>
            </thead>
            <tbody>
              {history.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <td className="p-2 text-ink-soft">{formatDateTime(m.captured_at)}</td>
                  <td className="p-2 capitalize text-ink-soft">{m.source}</td>
                  <td className="p-2">{formatMetric(m.views)}</td>
                  <td className="p-2">{formatMetric(m.reach)}</td>
                  <td className="p-2">{formatMetric(m.impressions)}</td>
                  <td className="p-2">{formatMetric(m.likes)}</td>
                  <td className="p-2">{formatMetric(m.comments)}</td>
                  <td className="p-2">{formatMetric(m.shares)}</td>
                  <td className="p-2">{formatMetric(m.saves)}</td>
                  <td className="p-2">{formatMetric(m.engagements)}</td>
                  <td className="p-2">{formatMetricRate(m.engagement_rate)}</td>
                  <td className="p-2">{m.is_estimated ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-line pt-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">Add a new snapshot</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {NUMERIC_FIELDS.map((f) => (
            <input
              key={f.key}
              type="number"
              className="input"
              placeholder={f.label}
              value={form[f.key]}
              onChange={(e) => setField(f.key, e.target.value)}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <select className="input w-auto" value={source} onChange={(e) => setSource(e.target.value as MetricSource)}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-ink-soft">
            <input type="checkbox" checked={isEstimated} onChange={(e) => setIsEstimated(e.target.checked)} />
            Estimated (not verified API data)
          </label>
          <button type="button" className="btn-primary" disabled={pending} onClick={submit}>
            {pending ? "Saving…" : "Save snapshot"}
          </button>
          {error ? <span className="text-xs text-status-danger">{error}</span> : null}
        </div>
      </div>
    </div>
  );
}
