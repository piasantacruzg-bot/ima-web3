// A test/mock provider (spec section 48, acceptance test #1: "Connect a
// test/mock provider using the adapter architecture"). This is the ONLY
// adapter that actually "connects" and returns data — and it is never
// registered in lib/integrations/registry.ts, so it can't leak into the
// real Integration Center UI or be mistaken for a live platform. It
// exists purely so lib/sync.ts and lib/content-matching.ts can be
// exercised end-to-end against a real (if fake) data source, without
// ever pretending a live Instagram/TikTok/X/YouTube session exists.

import type { SocialPlatform } from "@/types/database";
import type {
  AdapterAccountInfo,
  AdapterMetrics,
  AdapterPost,
  AdapterResult,
  GetPostsOptions,
  SocialPlatformAdapter,
  SyncResult,
} from "@/lib/integrations/social-platform-adapter";

export class MockSocialPlatformAdapter implements SocialPlatformAdapter {
  private posts = new Map<string, AdapterPost>();
  private metrics = new Map<string, AdapterMetrics>();
  private connected = true;

  constructor(
    public readonly platform: SocialPlatform,
    public readonly socialAccountId: string,
    seedPosts: AdapterPost[] = []
  ) {
    for (const post of seedPosts) this.posts.set(post.platformPostId, post);
  }

  isConfigured(): boolean {
    return true;
  }

  addPost(post: AdapterPost): void {
    this.posts.set(post.platformPostId, post);
  }

  // Lets a test change what the "API" reports between two sync runs,
  // to verify the sync engine creates a new snapshot rather than
  // overwriting the previous one.
  setMetrics(platformPostId: string, metrics: AdapterMetrics): void {
    this.metrics.set(platformPostId, metrics);
  }

  async connect(): Promise<AdapterResult<{ oauthUrl: string }>> {
    this.connected = true;
    return { ok: true, data: { oauthUrl: "mock://connected" } };
  }

  async disconnect(): Promise<AdapterResult<void>> {
    this.connected = false;
    return { ok: true, data: undefined };
  }

  async getAccount(): Promise<AdapterResult<AdapterAccountInfo>> {
    if (!this.connected) return { ok: false, error: "Mock account is disconnected." };
    return {
      ok: true,
      data: {
        platformUserId: `mock-${this.socialAccountId}`,
        username: "mock-account",
        followers: 10000,
        following: 100,
        postsCount: this.posts.size,
        profileUrl: null,
      },
    };
  }

  async getPosts(options?: GetPostsOptions): Promise<AdapterResult<AdapterPost[]>> {
    if (!this.connected) return { ok: false, error: "Mock account is disconnected." };
    let posts = [...this.posts.values()];
    if (options?.since) posts = posts.filter((p) => (p.publishedAt ?? "") >= options.since!);
    if (options?.limit) posts = posts.slice(0, options.limit);
    return { ok: true, data: posts };
  }

  async getPost(platformPostId: string): Promise<AdapterResult<AdapterPost>> {
    if (!this.connected) return { ok: false, error: "Mock account is disconnected." };
    const post = this.posts.get(platformPostId);
    if (!post) return { ok: false, error: "Post not found." };
    return { ok: true, data: post };
  }

  async getPostMetrics(platformPostId: string): Promise<AdapterResult<AdapterMetrics>> {
    if (!this.connected) return { ok: false, error: "Mock account is disconnected." };
    const metrics = this.metrics.get(platformPostId);
    if (!metrics) return { ok: false, error: "Metric unavailable via API." };
    return { ok: true, data: metrics };
  }

  async syncPost(platformPostId: string): Promise<AdapterResult<SyncResult>> {
    const result = await this.getPostMetrics(platformPostId);
    if (!result.ok) {
      return { ok: true, data: { recordsFound: 1, recordsCreated: 0, recordsUpdated: 0, recordsSkipped: 1, recordsFailed: 0 } };
    }
    return { ok: true, data: { recordsFound: 1, recordsCreated: 1, recordsUpdated: 0, recordsSkipped: 0, recordsFailed: 0 } };
  }

  async syncAccount(): Promise<AdapterResult<SyncResult>> {
    if (!this.connected) return { ok: false, error: "Mock account is disconnected." };
    let created = 0;
    let skipped = 0;
    for (const post of this.posts.values()) {
      const metrics = this.metrics.get(post.platformPostId);
      if (metrics) created += 1;
      else skipped += 1;
    }
    return {
      ok: true,
      data: { recordsFound: this.posts.size, recordsCreated: created, recordsUpdated: 0, recordsSkipped: skipped, recordsFailed: 0 },
    };
  }
}
