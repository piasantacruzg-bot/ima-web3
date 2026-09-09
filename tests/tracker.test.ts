import { describe, it, expect } from "vitest";
import { getTrackerItems, type DeliverableExecutionRow } from "@/lib/execution";
import type { Deliverable, StoryInstance, ContentMetrics } from "@/types/database";

function makeDeliverable(overrides: Partial<Deliverable> = {}): Deliverable {
  return {
    id: "d1",
    campaign_id: "c1",
    creator_id: "cr1",
    campaign_creator_id: "cc1",
    template_id: null,
    platform: "instagram",
    content_type: "instagram_reel",
    quantity: 1,
    status: "published",
    due_date: null,
    published_at: "2026-01-01T00:00:00Z",
    published_url: "https://instagram.com/p/abc",
    title: "Launch Reel",
    description: null,
    instructions: null,
    usage_rights: null,
    paid_media_rights: false,
    exclusivity: null,
    approval_required: false,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Deliverable;
}

function makeMetrics(overrides: Partial<ContentMetrics> = {}): ContentMetrics {
  return {
    id: "m1",
    content_id: null,
    story_instance_id: null,
    deliverable_id: null,
    captured_at: "2026-01-02T00:00:00Z",
    source: "manual",
    views: null,
    reach: null,
    impressions: null,
    likes: null,
    comments: null,
    shares: null,
    reposts: null,
    saves: null,
    clicks: null,
    replies: null,
    engagements: null,
    engagement_rate: null,
    engagement_rate_method: null,
    watch_time: null,
    average_watch_time: null,
    completion_rate: null,
    link_clicks: null,
    website_clicks: null,
    cta_clicks: null,
    sticker_taps: null,
    forward_taps: null,
    back_taps: null,
    exits: null,
    video_starts: null,
    three_second_views: null,
    other_metrics: {},
    is_estimated: false,
    captured_by: null,
    created_at: "2026-01-02T00:00:00Z",
    ...overrides,
  } as ContentMetrics;
}

function makeStoryInstance(overrides: Partial<StoryInstance> = {}): StoryInstance {
  return {
    id: "si1",
    deliverable_id: "d1",
    sequence_number: 1,
    status: "published",
    published_at: "2026-01-01T00:00:00Z",
    content_url: null,
    caption: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as StoryInstance;
}

const baseRow = {
  creator: { id: "cr1", display_name: "Jane Creator" },
  campaign: { id: "c1", campaign_name: "Luxury Miami Launch" },
};

describe("getTrackerItems", () => {
  it("emits one row per non-Story deliverable", () => {
    const rows: DeliverableExecutionRow[] = [
      {
        ...baseRow,
        deliverable: makeDeliverable(),
        isStory: false,
        contentPost: null,
        storyInstances: [],
        latestMetrics: makeMetrics({ views: 1000 }),
        aggregatedMetrics: {
          views: 1000,
          reach: null,
          impressions: null,
          likes: null,
          comments: null,
          shares: null,
          reposts: null,
          saves: null,
          clicks: null,
          replies: null,
          engagements: null,
          engagement_rate: null,
          engagement_rate_method: null,
          link_clicks: null,
          website_clicks: null,
          cta_clicks: null,
          sticker_taps: null,
          forward_taps: null,
          back_taps: null,
          exits: null,
          video_starts: null,
          three_second_views: null,
        },
        evidence: [],
        hasUrl: true,
        hasEvidence: false,
        hasMetrics: true,
        completeness: "partial",
      },
    ];

    const items = getTrackerItems(rows);
    expect(items).toHaveLength(1);
    expect(items[0].isStory).toBe(false);
    expect(items[0].metrics.views).toBe(1000);
  });

  it("emits one independently-trackable row per Story instance, never one shared row (spec section 5)", () => {
    const deliverable = makeDeliverable({ content_type: "instagram_story", quantity: 3, id: "d-story" });
    const instances = [1, 2, 3].map((n) =>
      makeStoryInstance({ id: `si${n}`, deliverable_id: "d-story", sequence_number: n })
    );
    const metricsByInstance = [18000, 16500, 15200];

    const rows: DeliverableExecutionRow[] = [
      {
        ...baseRow,
        deliverable,
        isStory: true,
        contentPost: null,
        storyInstances: instances.map((instance, i) => ({
          instance,
          latestMetrics: makeMetrics({ id: `m${i}`, story_instance_id: instance.id, views: metricsByInstance[i] }),
          evidence: [],
          completeness: "complete" as const,
        })),
        latestMetrics: null,
        aggregatedMetrics: {
          views: 49700,
          reach: null,
          impressions: null,
          likes: null,
          comments: null,
          shares: null,
          reposts: null,
          saves: null,
          clicks: null,
          replies: null,
          engagements: null,
          engagement_rate: null,
          engagement_rate_method: null,
          link_clicks: null,
          website_clicks: null,
          cta_clicks: null,
          sticker_taps: null,
          forward_taps: null,
          back_taps: null,
          exits: null,
          video_starts: null,
          three_second_views: null,
        },
        evidence: [],
        hasUrl: false,
        hasEvidence: false,
        hasMetrics: true,
        completeness: "complete",
      },
    ];

    const items = getTrackerItems(rows);
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.metrics.views)).toEqual([18000, 16500, 15200]);
    expect(new Set(items.map((i) => i.key)).size).toBe(3);
    // Changing one instance's metrics never touches the others' rows.
    expect(items[0].metrics.views).not.toBe(items[1].metrics.views);
  });

  it("a Story deliverable with zero instances yet falls back to a single row rather than vanishing", () => {
    const deliverable = makeDeliverable({ content_type: "instagram_story", quantity: 3, id: "d-empty" });
    const rows: DeliverableExecutionRow[] = [
      {
        ...baseRow,
        deliverable,
        isStory: true,
        contentPost: null,
        storyInstances: [],
        latestMetrics: null,
        aggregatedMetrics: {
          views: null,
          reach: null,
          impressions: null,
          likes: null,
          comments: null,
          shares: null,
          reposts: null,
          saves: null,
          clicks: null,
          replies: null,
          engagements: null,
          engagement_rate: null,
          engagement_rate_method: null,
          link_clicks: null,
          website_clicks: null,
          cta_clicks: null,
          sticker_taps: null,
          forward_taps: null,
          back_taps: null,
          exits: null,
          video_starts: null,
          three_second_views: null,
        },
        evidence: [],
        hasUrl: false,
        hasEvidence: false,
        hasMetrics: false,
        completeness: "missing",
      },
    ];

    const items = getTrackerItems(rows);
    expect(items).toHaveLength(1);
    expect(items[0].metrics.views).toBeNull();
  });

  it("flags needsReview for submitted/in_review statuses only", () => {
    const rows: DeliverableExecutionRow[] = [
      {
        ...baseRow,
        deliverable: makeDeliverable({ status: "submitted" }),
        isStory: false,
        contentPost: null,
        storyInstances: [],
        latestMetrics: null,
        aggregatedMetrics: {
          views: null,
          reach: null,
          impressions: null,
          likes: null,
          comments: null,
          shares: null,
          reposts: null,
          saves: null,
          clicks: null,
          replies: null,
          engagements: null,
          engagement_rate: null,
          engagement_rate_method: null,
          link_clicks: null,
          website_clicks: null,
          cta_clicks: null,
          sticker_taps: null,
          forward_taps: null,
          back_taps: null,
          exits: null,
          video_starts: null,
          three_second_views: null,
        },
        evidence: [],
        hasUrl: false,
        hasEvidence: false,
        hasMetrics: false,
        completeness: "missing",
      },
    ];

    const items = getTrackerItems(rows);
    expect(items[0].needsReview).toBe(true);
  });
});
