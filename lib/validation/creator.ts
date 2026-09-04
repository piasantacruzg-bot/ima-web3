import { z } from "zod";

const optionalTrimmed = () =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined));

// Comma-separated free text -> string[] (used for languages/categories/niches).
const csvToArray = () =>
  z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );

export const creatorFormSchema = z.object({
  display_name: z.string().trim().min(1, "Display name is required"),
  first_name: optionalTrimmed(),
  last_name: optionalTrimmed(),
  email: z.union([z.string().trim().email("Invalid email"), z.literal("")]).optional(),
  phone: optionalTrimmed(),
  country: optionalTrimmed(),
  city: optionalTrimmed(),
  gender: optionalTrimmed(),
  languages: csvToArray(),
  categories: csvToArray(),
  niches: csvToArray(),
  creator_type: z.enum(["nano", "micro", "mid", "macro", "mega", ""]).optional(),
  status: z.enum(["prospect", "approved", "active", "inactive", "do_not_work_with"]),
  bio: optionalTrimmed(),
  notes: optionalTrimmed(),
  manager_name: optionalTrimmed(),
  manager_email: z.union([z.string().trim().email("Invalid email"), z.literal("")]).optional(),
  agency_name: optionalTrimmed(),
  rate_card_notes: optionalTrimmed(),
  internal_rating: z
    .union([z.coerce.number().min(0).max(5), z.literal("")])
    .optional(),
  brand_fit_score: z
    .union([z.coerce.number().min(0).max(100), z.literal("")])
    .optional(),
  // Newline-separated pasted social profile URLs.
  social_urls: z.string().optional(),
});

export type CreatorFormValues = z.infer<typeof creatorFormSchema>;
