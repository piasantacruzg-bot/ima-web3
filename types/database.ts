// Hand-written types mirroring supabase/migrations/*.sql. Regenerate with
// `supabase gen types typescript` once a real project is linked — these are
// authored by hand so Phase 1 has full type safety without that dependency.

export type UserRole = "admin" | "manager" | "member";
export type CreatorType = "nano" | "micro" | "mid" | "macro" | "mega";
export type CreatorStatus =
  | "prospect"
  | "approved"
  | "active"
  | "inactive"
  | "do_not_work_with";
export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "x"
  | "youtube"
  | "facebook"
  | "other";
export type SocialAccountType = "personal" | "creator" | "business";
export type OauthStatus = "not_connected" | "connected" | "expired" | "revoked" | "error";
export type SyncStatus = "never_synced" | "syncing" | "synced" | "error" | "unsupported";
export type CampaignStatus =
  | "draft"
  | "proposal"
  | "approved"
  | "recruiting"
  | "active"
  | "completed"
  | "cancelled";
export type CampaignCreatorStatus =
  | "suggested"
  | "shortlisted"
  | "contacted"
  | "negotiating"
  | "approved"
  | "contracted"
  | "active"
  | "completed"
  | "removed";
export type PaymentStatus = "unpaid" | "invoiced" | "partial" | "paid";
export type ContractStatus = "not_sent" | "sent" | "negotiating" | "signed" | "declined";
export type BriefingStatus = "not_sent" | "sent" | "acknowledged" | "in_progress" | "complete";
export type DeliverableContentType =
  | "instagram_reel"
  | "instagram_post"
  | "instagram_carousel"
  | "instagram_story"
  | "tiktok"
  | "x_post"
  | "youtube_short"
  | "youtube_video"
  | "facebook_post"
  | "other";
export type DeliverableStatus =
  | "not_started"
  | "draft"
  | "submitted"
  | "needs_revision"
  | "approved"
  | "scheduled"
  | "published"
  | "late"
  | "cancelled";
export type CollectionMethod = "api" | "url_import" | "manual" | "screenshot";
export type MetricSource = "api" | "manual" | "screenshot" | "imported" | "url";
export type ImportFileType = "csv" | "xlsx";
export type ImportBatchStatus =
  | "uploaded"
  | "mapped"
  | "previewed"
  | "importing"
  | "completed"
  | "failed";
export type ImportRowStatus = "pending" | "imported" | "duplicate" | "error" | "skipped";
export type DuplicateResolution = "unresolved" | "merged" | "kept_separate";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type Creator = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  profile_image_url: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  state_province: string | null;
  languages: string[];
  gender: string | null;
  categories: string[];
  niches: string[];
  creator_type: CreatorType | null;
  status: CreatorStatus;
  bio: string | null;
  notes: string | null;
  manager_name: string | null;
  manager_email: string | null;
  agency_name: string | null;
  rate_card_notes: string | null;
  brand_fit_score: number | null;
  internal_rating: number | null;
  is_demo: boolean;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type SocialAccount = {
  id: string;
  creator_id: string;
  platform: SocialPlatform;
  username: string;
  profile_url: string | null;
  platform_user_id: string | null;
  followers: number | null;
  following: number | null;
  posts_count: number | null;
  engagement_rate: number | null;
  average_likes: number | null;
  average_comments: number | null;
  average_views: number | null;
  average_shares: number | null;
  average_saves: number | null;
  estimated_reach: number | null;
  account_type: SocialAccountType | null;
  is_connected: boolean;
  oauth_status: OauthStatus;
  access_token_reference: string | null;
  token_expires_at: string | null;
  last_synced_at: string | null;
  sync_status: SyncStatus;
  sync_error: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export type CreatorPerformanceSnapshot = {
  id: string;
  creator_id: string;
  social_account_id: string | null;
  campaign_id: string | null;
  content_id: string | null;
  snapshot_date: string;
  followers: number | null;
  reach: number | null;
  impressions: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  engagements: number | null;
  engagement_rate: number | null;
  cpm: number | null;
  cpe: number | null;
  cost_per_reach: number | null;
  created_at: string;
}

export type TargetAudience = {
  age_range?: string;
  gender?: string;
  locations?: string[];
  interests?: string[];
  languages?: string[];
}

export type CreatorRequirements = {
  min_followers?: number;
  max_followers?: number;
  min_engagement?: number;
  creator_types?: CreatorType[];
  locations?: string[];
  budget_per_creator?: number;
  creator_count?: number;
}

export type Campaign = {
  id: string;
  campaign_name: string;
  client_name: string;
  brand_name: string | null;
  description: string | null;
  market: string | null;
  country: string | null;
  city: string | null;
  campaign_type: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  status: CampaignStatus;
  campaign_objectives: string | null;
  target_audience: TargetAudience;
  target_categories: string[];
  target_platforms: SocialPlatform[];
  creator_requirements: CreatorRequirements;
  notes: string | null;
  is_demo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignCreator = {
  id: string;
  campaign_id: string;
  creator_id: string;
  status: CampaignCreatorStatus;
  negotiated_fee: number | null;
  approved_fee: number | null;
  payment_status: PaymentStatus;
  contract_status: ContractStatus;
  briefing_status: BriefingStatus;
  match_score: number | null;
  match_reasons: string[];
  notes: string | null;
  added_by: string | null;
  added_at: string;
  updated_at: string;
}

export type Deliverable = {
  id: string;
  campaign_id: string;
  creator_id: string;
  platform: SocialPlatform;
  content_type: DeliverableContentType;
  quantity: number;
  due_date: string | null;
  status: DeliverableStatus;
  instructions: string | null;
  caption_required: boolean;
  approval_required: boolean;
  published_url: string | null;
  published_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ContentPost = {
  id: string;
  campaign_id: string;
  creator_id: string;
  deliverable_id: string | null;
  social_account_id: string | null;
  platform: SocialPlatform;
  content_type: DeliverableContentType;
  post_url: string;
  platform_post_id: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  published_at: string | null;
  collection_method: CollectionMethod;
  sync_status: SyncStatus;
  sync_error: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ContentMetrics = {
  id: string;
  content_id: string;
  captured_at: string;
  source: MetricSource;
  views: number | null;
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  replies: number | null;
  engagements: number | null;
  engagement_rate: number | null;
  watch_time: number | null;
  completion_rate: number | null;
  link_clicks: number | null;
  sticker_taps: number | null;
  other_metrics: Record<string, unknown>;
  captured_by: string | null;
  created_at: string;
}

export type StoryMetrics = {
  id: string;
  creator_id: string;
  campaign_id: string | null;
  social_account_id: string | null;
  deliverable_id: string | null;
  screenshot_url: string | null;
  story_date: string;
  story_sequence: number;
  views: number | null;
  reach: number | null;
  replies: number | null;
  link_clicks: number | null;
  sticker_taps: number | null;
  exits: number | null;
  other_metrics: Record<string, unknown>;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ImportBatch = {
  id: string;
  source_filename: string;
  file_type: ImportFileType;
  status: ImportBatchStatus;
  column_mapping: Record<string, string>;
  storage_path: string | null;
  total_rows: number;
  imported_rows: number;
  duplicate_rows: number;
  error_rows: number;
  error_message: string | null;
  uploaded_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export type ImportRow = {
  id: string;
  batch_id: string;
  row_number: number;
  raw_data: Record<string, unknown>;
  normalized_data: Record<string, unknown> | null;
  status: ImportRowStatus;
  possible_duplicate_creator_id: string | null;
  duplicate_resolution: DuplicateResolution;
  error_message: string | null;
  created_creator_id: string | null;
  created_at: string;
}

export type AuditLogEntry = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export type AppSettings = {
  id: number;
  agency_name: string;
  agency_logo_url: string | null;
  default_currency: string;
  default_campaign_settings: Record<string, unknown>;
  report_settings: Record<string, unknown>;
  sync_frequency_hours: number;
  updated_by: string | null;
  updated_at: string;
}

export type CreatorScoringWeights = {
  id: number;
  engagement_weight: number;
  avg_views_weight: number;
  historical_performance_weight: number;
  audience_fit_weight: number;
  brand_fit_weight: number;
  cost_efficiency_weight: number;
  reliability_weight: number;
  updated_by: string | null;
  updated_at: string;
}

export type CreatorWithStats = Creator & {
  max_followers: number;
  avg_engagement_rate: number;
  max_average_views: number;
  max_average_likes: number;
  max_average_comments: number;
  max_average_shares: number;
  max_estimated_reach: number;
  campaign_count: number;
  platforms: SocialPlatform[] | null;
  tags: string[] | null;
  primary_platform: SocialPlatform | null;
  primary_username: string | null;
};

export type CreatorNote = {
  id: string;
  creator_id: string;
  body: string;
  author_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatorTag = {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
};

export type CreatorTagAssignment = {
  id: string;
  creator_id: string;
  tag_id: string;
  assigned_by: string | null;
  assigned_at: string;
};

export type SavedCreatorFilter = {
  id: string;
  name: string;
  user_id: string;
  filter_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      creators: TableDef<Creator>;
      social_accounts: TableDef<SocialAccount>;
      creator_performance_snapshots: TableDef<CreatorPerformanceSnapshot>;
      campaigns: TableDef<Campaign>;
      campaign_creators: TableDef<CampaignCreator>;
      deliverables: TableDef<Deliverable>;
      content_posts: TableDef<ContentPost>;
      content_metrics: TableDef<ContentMetrics>;
      story_metrics: TableDef<StoryMetrics>;
      import_batches: TableDef<ImportBatch>;
      import_rows: TableDef<ImportRow>;
      audit_log: TableDef<AuditLogEntry>;
      app_settings: TableDef<AppSettings>;
      creator_scoring_weights: TableDef<CreatorScoringWeights>;
      creator_notes: TableDef<CreatorNote>;
      creator_tags: TableDef<CreatorTag>;
      creator_tag_assignments: TableDef<CreatorTagAssignment>;
      saved_creator_filters: TableDef<SavedCreatorFilter>;
    };
    Views: {
      creators_with_stats: { Row: CreatorWithStats; Relationships: [] };
    };
    Functions: { [_ in never]: never };
    Enums: {
      user_role: UserRole;
      creator_type: CreatorType;
      creator_status: CreatorStatus;
      social_platform: SocialPlatform;
      campaign_status: CampaignStatus;
      deliverable_status: DeliverableStatus;
    };
  };
}
