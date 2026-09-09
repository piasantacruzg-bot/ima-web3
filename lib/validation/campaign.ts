import { z } from "zod";

// Validates the assembled campaign object the wizard/dashboard submits —
// unlike the creator form (parsed from FormData), the campaign wizard
// collects structured state across several steps and calls the server
// action with a plain object, so this validates that object directly.

const targetAudienceSchema = z
  .object({
    age_range: z.string().optional(),
    gender: z.string().optional(),
    locations: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
  })
  .partial();

const creatorRequirementsSchema = z
  .object({
    min_followers: z.number().min(0).optional(),
    max_followers: z.number().min(0).optional(),
    min_engagement: z.number().min(0).optional(),
    max_engagement: z.number().min(0).optional(),
    min_average_views: z.number().min(0).optional(),
    max_average_views: z.number().min(0).optional(),
    min_brand_fit: z.number().min(0).max(100).optional(),
    min_rating: z.number().min(1).max(5).optional(),
    creator_types: z.array(z.enum(["nano", "micro", "mid", "macro", "mega"])).optional(),
    categories: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    allowed_statuses: z
      .array(z.enum(["prospect", "approved", "active", "inactive", "do_not_work_with"]))
      .optional(),
    budget_per_creator: z.number().min(0).optional(),
    creator_count: z.number().min(0).optional(),
  })
  .partial();

const matchingWeightsSchema = z
  .object({
    platform: z.number().min(0).max(100).optional(),
    category: z.number().min(0).max(100).optional(),
    location: z.number().min(0).max(100).optional(),
    followers: z.number().min(0).max(100).optional(),
    engagement: z.number().min(0).max(100).optional(),
    views: z.number().min(0).max(100).optional(),
    brandFit: z.number().min(0).max(100).optional(),
    rating: z.number().min(0).max(100).optional(),
    historicalPerformance: z.number().min(0).max(100).optional(),
    costEfficiency: z.number().min(0).max(100).optional(),
  })
  .partial();

export const campaignSchema = z.object({
  campaign_name: z.string().trim().min(1, "Campaign name is required"),
  client_name: z.string().trim().min(1, "Client is required"),
  brand_name: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  campaign_type: z.string().trim().optional().nullable(),
  market: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  language: z.array(z.string()).default([]),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.enum(["draft", "proposal", "approved", "recruiting", "active", "completed", "cancelled"]),
  primary_objective: z.string().trim().optional().nullable(),
  secondary_objectives: z.array(z.string()).default([]),
  campaign_objectives: z.string().trim().optional().nullable(),
  target_audience: targetAudienceSchema.default({}),
  target_categories: z.array(z.string()).default([]),
  target_platforms: z.array(z.enum(["instagram", "tiktok", "youtube", "x", "facebook", "other"])).default([]),
  creator_requirements: creatorRequirementsSchema.default({}),
  matching_weights: matchingWeightsSchema.default({}),
  budget: z.number().min(0).optional().nullable(),
  creator_budget: z.number().min(0).optional().nullable(),
  production_budget: z.number().min(0).optional().nullable(),
  paid_media_budget: z.number().min(0).optional().nullable(),
  agency_fee: z.number().min(0).optional().nullable(),
  other_budget: z.number().min(0).optional().nullable(),
  excluded_creator_ids: z.array(z.string()).default([]),
  excluded_categories: z.array(z.string()).default([]),
  excluded_locations: z.array(z.string()).default([]),
  notes: z.string().trim().optional().nullable(),
  owner_id: z.string().optional().nullable(),
});

export type CampaignFormValues = z.infer<typeof campaignSchema>;

export const deliverableTemplateSchema = z.object({
  platform: z.enum(["instagram", "tiktok", "youtube", "x", "facebook", "other"]),
  content_type: z.enum([
    "instagram_reel",
    "instagram_post",
    "instagram_carousel",
    "instagram_story",
    "tiktok",
    "x_post",
    "youtube_short",
    "youtube_video",
    "facebook_post",
    "other",
  ]),
  quantity: z.number().int().min(1).default(1),
  default_due_date: z.string().optional().nullable(),
  instructions: z.string().trim().optional().nullable(),
  usage_rights: z.string().trim().optional().nullable(),
  paid_media_rights: z.boolean().default(false),
  exclusivity_requirements: z.string().trim().optional().nullable(),
  approval_required: z.boolean().default(true),
  notes: z.string().trim().optional().nullable(),
});

export type DeliverableTemplateFormValues = z.infer<typeof deliverableTemplateSchema>;
