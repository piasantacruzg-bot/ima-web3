"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveCampaign,
  addDeliverableTemplate,
  removeDeliverableTemplate,
  shortlistCampaignCreator,
  selectCampaignCreator,
  rejectCampaignCreator,
  getRecommendedCreators,
  type RecommendedCreator,
} from "@/app/(app)/campaigns/actions";
import { calculateCampaignBudget } from "@/lib/campaigns/budget";
import { formatCurrency, formatCompactNumber, formatPercent } from "@/lib/format";
import type {
  Campaign,
  CampaignStatus,
  CreatorRequirements,
  CreatorStatus,
  CreatorType,
  SocialPlatform,
  TargetAudience,
} from "@/types/database";

type CampaignType_ = string; // free text, not a strict DB enum

const STEPS = [
  "Basics",
  "Objectives",
  "Audience & Market",
  "Creator Requirements",
  "Deliverables",
  "Budget",
  "Creator Selection",
  "Review & Create",
] as const;

const CAMPAIGN_TYPES = [
  "Influencer Campaign",
  "Product Launch",
  "Event",
  "Brand Awareness",
  "UGC",
  "Social Activation",
  "Ambassador Program",
  "PR / Seeding",
  "Other",
];

const OBJECTIVES = [
  "Awareness",
  "Reach",
  "Engagement",
  "Traffic",
  "Conversions",
  "Sales",
  "App Downloads",
  "Event Attendance",
  "Content Creation",
  "UGC",
  "Brand Positioning",
  "Product Launch",
];

const PLATFORMS: SocialPlatform[] = ["instagram", "tiktok", "youtube", "x", "facebook", "other"];
const CREATOR_TYPES: CreatorType[] = ["nano", "micro", "mid", "macro", "mega"];
const CONTENT_TYPES = [
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
] as const;

function csvToArray(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

interface DeliverableTemplateDraft {
  id: string;
  platform: SocialPlatform;
  content_type: (typeof CONTENT_TYPES)[number];
  quantity: number;
  default_due_date: string;
  instructions: string;
  usage_rights: string;
  paid_media_rights: boolean;
  exclusivity_requirements: string;
  approval_required: boolean;
  notes: string;
}

interface WizardState {
  campaign_name: string;
  client_name: string;
  brand_name: string;
  description: string;
  campaign_type: CampaignType_;
  market: string;
  country: string;
  city: string;
  language: string;
  start_date: string;
  end_date: string;
  owner_id: string;
  notes: string;
  primary_objective: string;
  secondary_objectives: string[];
  campaign_objectives: string;
  target_audience: TargetAudience;
  target_platforms: SocialPlatform[];
  target_categories: string;
  creator_requirements: CreatorRequirements & { allow_do_not_work_with?: boolean };
  excluded_categories: string;
  excluded_locations: string;
  budget: string;
  creator_budget: string;
  production_budget: string;
  paid_media_budget: string;
  agency_fee: string;
  other_budget: string;
}

const initialState: WizardState = {
  campaign_name: "",
  client_name: "",
  brand_name: "",
  description: "",
  campaign_type: "",
  market: "",
  country: "",
  city: "",
  language: "",
  start_date: "",
  end_date: "",
  owner_id: "",
  notes: "",
  primary_objective: "",
  secondary_objectives: [],
  campaign_objectives: "",
  target_audience: {},
  target_platforms: [],
  target_categories: "",
  creator_requirements: {},
  excluded_categories: "",
  excluded_locations: "",
  budget: "",
  creator_budget: "",
  production_budget: "",
  paid_media_budget: "",
  agency_fee: "",
  other_budget: "",
};

function num(value: string): number | undefined {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) ? n : undefined;
}

function campaignToWizardState(campaign: Campaign): WizardState {
  const requirements = campaign.creator_requirements ?? {};
  return {
    campaign_name: campaign.campaign_name,
    client_name: campaign.client_name,
    brand_name: campaign.brand_name ?? "",
    description: campaign.description ?? "",
    campaign_type: campaign.campaign_type ?? "",
    market: campaign.market ?? "",
    country: campaign.country ?? "",
    city: campaign.city ?? "",
    language: (campaign.language ?? []).join(", "),
    start_date: campaign.start_date ?? "",
    end_date: campaign.end_date ?? "",
    owner_id: campaign.owner_id ?? "",
    notes: campaign.notes ?? "",
    primary_objective: campaign.primary_objective ?? "",
    secondary_objectives: campaign.secondary_objectives ?? [],
    campaign_objectives: campaign.campaign_objectives ?? "",
    target_audience: campaign.target_audience ?? {},
    target_platforms: campaign.target_platforms ?? [],
    target_categories: (campaign.target_categories ?? []).join(", "),
    creator_requirements: {
      ...requirements,
      allow_do_not_work_with: (requirements.allowed_statuses ?? []).includes("do_not_work_with"),
    },
    excluded_categories: (campaign.excluded_categories ?? []).join(", "),
    excluded_locations: (campaign.excluded_locations ?? []).join(", "),
    budget: campaign.budget?.toString() ?? "",
    creator_budget: campaign.creator_budget?.toString() ?? "",
    production_budget: campaign.production_budget?.toString() ?? "",
    paid_media_budget: campaign.paid_media_budget?.toString() ?? "",
    agency_fee: campaign.agency_fee?.toString() ?? "",
    other_budget: campaign.other_budget?.toString() ?? "",
  };
}

export function CampaignWizard({
  owners,
  initialCampaign,
  initialTemplates = [],
}: {
  owners: { id: string; full_name: string | null; email: string }[];
  initialCampaign?: Campaign;
  initialTemplates?: DeliverableTemplateDraft[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(
    initialCampaign ? campaignToWizardState(initialCampaign) : initialState
  );
  const [campaignId, setCampaignId] = useState<string | null>(initialCampaign?.id ?? null);
  const [templates, setTemplates] = useState<DeliverableTemplateDraft[]>(initialTemplates);
  const [recommended, setRecommended] = useState<RecommendedCreator[] | null>(null);
  const [decidedCreatorIds, setDecidedCreatorIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalStatus, setFinalStatus] = useState<CampaignStatus>(initialCampaign?.status ?? "proposal");

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function buildPayload(status: CampaignStatus) {
    const { allow_do_not_work_with, ...requirements } = state.creator_requirements;
    return {
      id: campaignId ?? undefined,
      campaign_name: state.campaign_name,
      client_name: state.client_name,
      brand_name: state.brand_name || null,
      description: state.description || null,
      campaign_type: state.campaign_type || null,
      market: state.market || null,
      country: state.country || null,
      city: state.city || null,
      language: csvToArray(state.language),
      start_date: state.start_date || null,
      end_date: state.end_date || null,
      owner_id: state.owner_id || null,
      notes: state.notes || null,
      status,
      primary_objective: state.primary_objective || null,
      secondary_objectives: state.secondary_objectives,
      campaign_objectives: state.campaign_objectives || null,
      target_audience: state.target_audience,
      target_platforms: state.target_platforms,
      target_categories: csvToArray(state.target_categories),
      creator_requirements: {
        ...requirements,
        allowed_statuses: (allow_do_not_work_with
          ? ["approved", "active", "do_not_work_with"]
          : ["approved", "active"]) as CreatorStatus[],
      },
      matching_weights: {},
      excluded_creator_ids: [],
      excluded_categories: csvToArray(state.excluded_categories),
      excluded_locations: csvToArray(state.excluded_locations),
      budget: num(state.budget) ?? null,
      creator_budget: num(state.creator_budget) ?? null,
      production_budget: num(state.production_budget) ?? null,
      paid_media_budget: num(state.paid_media_budget) ?? null,
      agency_fee: num(state.agency_fee) ?? null,
      other_budget: num(state.other_budget) ?? null,
    };
  }

  async function persist(status: CampaignStatus): Promise<string | null> {
    setError(null);
    if (!state.campaign_name.trim() || !state.client_name.trim()) {
      setError("Campaign name and client are required.");
      return null;
    }
    setIsSaving(true);
    try {
      const result = await saveCampaign(buildPayload(status));
      if ("error" in result) {
        setError(result.error);
        return null;
      }
      setCampaignId(result.campaignId);
      return result.campaignId;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveDraft() {
    const id = await persist("draft");
    if (id) router.push(`/campaigns/${id}`);
  }

  async function goToStep(next: number) {
    // Deliverables (step 4) and everything after need a real campaign row
    // for their foreign keys — persisted here as a draft the first time,
    // then just kept in sync on every later "Continue".
    if (next >= 4 && !campaignId) {
      const id = await persist("draft");
      if (!id) return;
    } else if (campaignId) {
      await persist("draft");
    }
    if (next === 6 && campaignId) {
      const list = await getRecommendedCreators(campaignId);
      setRecommended(list);
    }
    setStep(next);
  }

  async function handleAddTemplate(template: Omit<DeliverableTemplateDraft, "id">) {
    if (!campaignId) return;
    const result = await addDeliverableTemplate(campaignId, {
      ...template,
      default_due_date: template.default_due_date || null,
      instructions: template.instructions || null,
      usage_rights: template.usage_rights || null,
      exclusivity_requirements: template.exclusivity_requirements || null,
      notes: template.notes || null,
    });
    if (result && "error" in result) {
      setError(result.error);
      return;
    }
    setTemplates((t) => [...t, { ...template, id: crypto.randomUUID() }]);
  }

  async function handleFinalCreate() {
    const id = await persist(finalStatus);
    if (id) router.push(`/campaigns/${id}`);
  }

  const budgetSummary = useMemo(
    () =>
      calculateCampaignBudget(
        {
          budget: num(state.budget) ?? null,
          creatorBudget: num(state.creator_budget) ?? null,
          productionBudget: num(state.production_budget) ?? null,
          paidMediaBudget: num(state.paid_media_budget) ?? null,
          agencyFee: num(state.agency_fee) ?? null,
          otherBudget: num(state.other_budget) ?? null,
        },
        []
      ),
    [state.budget, state.creator_budget, state.production_budget, state.paid_media_budget, state.agency_fee, state.other_budget]
  );

  return (
    <div>
      <ol className="mb-6 flex flex-wrap gap-x-1 gap-y-2 text-xs">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`rounded-full border px-2.5 py-1 ${
              i === step
                ? "border-ink bg-ink text-paper-raised"
                : i < step
                  ? "border-line text-ink-soft"
                  : "border-line/60 text-ink-soft/50"
            }`}
          >
            <span className="mr-1 font-medium">{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {error ? <p className="mb-4 text-sm text-status-danger">{error}</p> : null}

      {step === 0 && (
        <div className="card space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Campaign name *">
              <input className="input" value={state.campaign_name} onChange={(e) => update("campaign_name", e.target.value)} />
            </Field>
            <Field label="Client *">
              <input className="input" value={state.client_name} onChange={(e) => update("client_name", e.target.value)} />
            </Field>
            <Field label="Brand">
              <input className="input" value={state.brand_name} onChange={(e) => update("brand_name", e.target.value)} />
            </Field>
            <Field label="Campaign type">
              <select className="input" value={state.campaign_type} onChange={(e) => update("campaign_type", e.target.value)}>
                <option value="">—</option>
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start date">
              <input type="date" className="input" value={state.start_date} onChange={(e) => update("start_date", e.target.value)} />
            </Field>
            <Field label="End date">
              <input type="date" className="input" value={state.end_date} onChange={(e) => update("end_date", e.target.value)} />
            </Field>
            <Field label="Market">
              <input className="input" value={state.market} onChange={(e) => update("market", e.target.value)} />
            </Field>
            <Field label="Country">
              <input className="input" value={state.country} onChange={(e) => update("country", e.target.value)} />
            </Field>
            <Field label="City">
              <input className="input" value={state.city} onChange={(e) => update("city", e.target.value)} />
            </Field>
            <Field label="Language(s)">
              <input
                className="input"
                placeholder="English, Spanish"
                value={state.language}
                onChange={(e) => update("language", e.target.value)}
              />
            </Field>
            <Field label="Internal owner">
              <select className="input" value={state.owner_id} onChange={(e) => update("owner_id", e.target.value)}>
                <option value="">—</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.full_name ?? o.email}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea className="input" rows={3} value={state.description} onChange={(e) => update("description", e.target.value)} />
          </Field>
          <Field label="Notes">
            <textarea className="input" rows={2} value={state.notes} onChange={(e) => update("notes", e.target.value)} />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="card space-y-4 p-6">
          <Field label="Primary objective">
            <select className="input" value={state.primary_objective} onChange={(e) => update("primary_objective", e.target.value)}>
              <option value="">—</option>
              {OBJECTIVES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Secondary objectives">
            <div className="flex flex-wrap gap-2">
              {OBJECTIVES.map((o) => (
                <label key={o} className="flex items-center gap-1.5 rounded-sm border border-line px-2 py-1 text-xs">
                  <input
                    type="checkbox"
                    checked={state.secondary_objectives.includes(o)}
                    onChange={(e) =>
                      update(
                        "secondary_objectives",
                        e.target.checked
                          ? [...state.secondary_objectives, o]
                          : state.secondary_objectives.filter((x) => x !== o)
                      )
                    }
                  />
                  {o}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Objective notes">
            <textarea
              className="input"
              rows={3}
              value={state.campaign_objectives}
              onChange={(e) => update("campaign_objectives", e.target.value)}
            />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="card space-y-4 p-6">
          <p className="text-xs text-ink-soft">
            Campaign target audience — who the brand wants to reach. This is separate from creator audience data,
            which only appears here when the database has verified figures for a creator.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Age range">
              <input
                className="input"
                placeholder="18-34"
                value={state.target_audience.age_range ?? ""}
                onChange={(e) => update("target_audience", { ...state.target_audience, age_range: e.target.value })}
              />
            </Field>
            <Field label="Gender">
              <input
                className="input"
                value={state.target_audience.gender ?? ""}
                onChange={(e) => update("target_audience", { ...state.target_audience, gender: e.target.value })}
              />
            </Field>
            <Field label="Locations">
              <input
                className="input"
                placeholder="Miami, National"
                value={(state.target_audience.locations ?? []).join(", ")}
                onChange={(e) =>
                  update("target_audience", { ...state.target_audience, locations: csvToArray(e.target.value) })
                }
              />
            </Field>
            <Field label="Interests">
              <input
                className="input"
                placeholder="fashion, lifestyle"
                value={(state.target_audience.interests ?? []).join(", ")}
                onChange={(e) =>
                  update("target_audience", { ...state.target_audience, interests: csvToArray(e.target.value) })
                }
              />
            </Field>
            <Field label="Languages">
              <input
                className="input"
                value={(state.target_audience.languages ?? []).join(", ")}
                onChange={(e) =>
                  update("target_audience", { ...state.target_audience, languages: csvToArray(e.target.value) })
                }
              />
            </Field>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card space-y-4 p-6">
          <Field label="Platforms">
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <label key={p} className="flex items-center gap-1.5 rounded-sm border border-line px-2 py-1 text-xs capitalize">
                  <input
                    type="checkbox"
                    checked={state.target_platforms.includes(p)}
                    onChange={(e) =>
                      update(
                        "target_platforms",
                        e.target.checked ? [...state.target_platforms, p] : state.target_platforms.filter((x) => x !== p)
                      )
                    }
                  />
                  {p}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Required categories">
            <input
              className="input"
              placeholder="Fashion, Lifestyle"
              value={state.target_categories}
              onChange={(e) => update("target_categories", e.target.value)}
            />
          </Field>
          <Field label="Creator type">
            <div className="flex flex-wrap gap-2">
              {CREATOR_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-1.5 rounded-sm border border-line px-2 py-1 text-xs capitalize">
                  <input
                    type="checkbox"
                    checked={(state.creator_requirements.creator_types ?? []).includes(t)}
                    onChange={(e) => {
                      const current = state.creator_requirements.creator_types ?? [];
                      update("creator_requirements", {
                        ...state.creator_requirements,
                        creator_types: e.target.checked ? [...current, t] : current.filter((x) => x !== t),
                      });
                    }}
                  />
                  {t}
                </label>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Minimum followers">
              <input
                type="number"
                className="input"
                value={state.creator_requirements.min_followers ?? ""}
                onChange={(e) =>
                  update("creator_requirements", { ...state.creator_requirements, min_followers: num(e.target.value) })
                }
              />
            </Field>
            <Field label="Maximum followers">
              <input
                type="number"
                className="input"
                value={state.creator_requirements.max_followers ?? ""}
                onChange={(e) =>
                  update("creator_requirements", { ...state.creator_requirements, max_followers: num(e.target.value) })
                }
              />
            </Field>
            <Field label="Minimum engagement rate (%)">
              <input
                type="number"
                className="input"
                value={state.creator_requirements.min_engagement ?? ""}
                onChange={(e) =>
                  update("creator_requirements", { ...state.creator_requirements, min_engagement: num(e.target.value) })
                }
              />
            </Field>
            <Field label="Maximum engagement rate (%)">
              <input
                type="number"
                className="input"
                value={state.creator_requirements.max_engagement ?? ""}
                onChange={(e) =>
                  update("creator_requirements", { ...state.creator_requirements, max_engagement: num(e.target.value) })
                }
              />
            </Field>
            <Field label="Minimum average views">
              <input
                type="number"
                className="input"
                value={state.creator_requirements.min_average_views ?? ""}
                onChange={(e) =>
                  update("creator_requirements", {
                    ...state.creator_requirements,
                    min_average_views: num(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Minimum brand fit (0-100)">
              <input
                type="number"
                className="input"
                value={state.creator_requirements.min_brand_fit ?? ""}
                onChange={(e) =>
                  update("creator_requirements", { ...state.creator_requirements, min_brand_fit: num(e.target.value) })
                }
              />
            </Field>
            <Field label="Minimum internal rating (1-5)">
              <input
                type="number"
                className="input"
                value={state.creator_requirements.min_rating ?? ""}
                onChange={(e) =>
                  update("creator_requirements", { ...state.creator_requirements, min_rating: num(e.target.value) })
                }
              />
            </Field>
            <Field label="Locations">
              <input
                className="input"
                placeholder="Miami"
                value={(state.creator_requirements.locations ?? []).join(", ")}
                onChange={(e) =>
                  update("creator_requirements", { ...state.creator_requirements, locations: csvToArray(e.target.value) })
                }
              />
            </Field>
            <Field label="Budget per creator">
              <input
                type="number"
                className="input"
                value={state.creator_requirements.budget_per_creator ?? ""}
                onChange={(e) =>
                  update("creator_requirements", {
                    ...state.creator_requirements,
                    budget_per_creator: num(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Creator count">
              <input
                type="number"
                className="input"
                value={state.creator_requirements.creator_count ?? ""}
                onChange={(e) =>
                  update("creator_requirements", { ...state.creator_requirements, creator_count: num(e.target.value) })
                }
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-xs text-status-danger">
            <input
              type="checkbox"
              checked={state.creator_requirements.allow_do_not_work_with ?? false}
              onChange={(e) =>
                update("creator_requirements", { ...state.creator_requirements, allow_do_not_work_with: e.target.checked })
              }
            />
            Override: allow recommending creators marked &quot;Do Not Work With&quot; (not recommended)
          </label>
          <div className="grid grid-cols-2 gap-4 border-t border-line pt-4">
            <Field label="Exclude categories">
              <input
                className="input"
                value={state.excluded_categories}
                onChange={(e) => update("excluded_categories", e.target.value)}
              />
            </Field>
            <Field label="Exclude locations">
              <input
                className="input"
                value={state.excluded_locations}
                onChange={(e) => update("excluded_locations", e.target.value)}
              />
            </Field>
          </div>
        </div>
      )}

      {step === 4 && (
        <DeliverablesStep templates={templates} onAdd={handleAddTemplate} onRemove={(id) => setTemplates((t) => t.filter((x) => x.id !== id))} campaignId={campaignId} />
      )}

      {step === 5 && (
        <div className="card space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Total campaign budget">
              <input type="number" className="input" value={state.budget} onChange={(e) => update("budget", e.target.value)} />
            </Field>
            <Field label="Creator budget">
              <input
                type="number"
                className="input"
                value={state.creator_budget}
                onChange={(e) => update("creator_budget", e.target.value)}
              />
            </Field>
            <Field label="Production budget">
              <input
                type="number"
                className="input"
                value={state.production_budget}
                onChange={(e) => update("production_budget", e.target.value)}
              />
            </Field>
            <Field label="Paid media budget">
              <input
                type="number"
                className="input"
                value={state.paid_media_budget}
                onChange={(e) => update("paid_media_budget", e.target.value)}
              />
            </Field>
            <Field label="Agency fee">
              <input type="number" className="input" value={state.agency_fee} onChange={(e) => update("agency_fee", e.target.value)} />
            </Field>
            <Field label="Other costs">
              <input type="number" className="input" value={state.other_budget} onChange={(e) => update("other_budget", e.target.value)} />
            </Field>
          </div>
          <div className="rounded-sm border border-line bg-paper p-4 text-sm">
            <p>Total allocated: {formatCurrency(budgetSummary.totalAllocated)}</p>
            {budgetSummary.overallRemaining !== null ? (
              <p className={budgetSummary.isOverAllocated ? "text-status-danger" : "text-ink-soft"}>
                Remaining: {formatCurrency(budgetSummary.overallRemaining)}
              </p>
            ) : null}
            {budgetSummary.warnings.map((w) => (
              <p key={w} className="text-status-warning">
                ⚠ {w}
              </p>
            ))}
          </div>
        </div>
      )}

      {step === 6 && (
        <CreatorSelectionStep
          campaignId={campaignId}
          recommended={recommended}
          decidedCreatorIds={decidedCreatorIds}
          onDecide={(id) => setDecidedCreatorIds((s) => new Set(s).add(id))}
        />
      )}

      {step === 7 && (
        <div className="card space-y-4 p-6">
          <p className="text-sm text-ink-soft">Review the campaign, then choose a starting status to create it.</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-ink-soft">Campaign</dt>
              <dd className="text-ink">{state.campaign_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">Client</dt>
              <dd className="text-ink">{state.client_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">Platforms</dt>
              <dd className="text-ink">{state.target_platforms.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">Deliverable templates</dt>
              <dd className="text-ink">{templates.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">Creators decided so far</dt>
              <dd className="text-ink">{decidedCreatorIds.size}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">Budget</dt>
              <dd className="text-ink">{formatCurrency(num(state.budget) ?? null)}</dd>
            </div>
          </dl>
          <Field label="Starting status">
            <select className="input w-auto" value={finalStatus} onChange={(e) => setFinalStatus(e.target.value as CampaignStatus)}>
              <option value="draft">Draft</option>
              <option value="proposal">Proposal</option>
              <option value="recruiting">Recruiting</option>
              <option value="approved">Approved</option>
            </select>
          </Field>
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <div className="flex gap-2">
          {step > 0 ? (
            <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)} disabled={isSaving}>
              Back
            </button>
          ) : null}
          <button type="button" className="btn-secondary" onClick={handleSaveDraft} disabled={isSaving}>
            Save as draft &amp; exit
          </button>
        </div>
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn-primary" onClick={() => goToStep(step + 1)} disabled={isSaving}>
            Continue
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={handleFinalCreate} disabled={isSaving}>
            {isSaving ? "Creating…" : "Create campaign"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function DeliverablesStep({
  templates,
  onAdd,
  onRemove,
  campaignId,
}: {
  templates: DeliverableTemplateDraft[];
  onAdd: (t: Omit<DeliverableTemplateDraft, "id">) => void;
  onRemove: (id: string) => void;
  campaignId: string | null;
}) {
  const [draft, setDraft] = useState<Omit<DeliverableTemplateDraft, "id">>({
    platform: "instagram",
    content_type: "instagram_reel",
    quantity: 1,
    default_due_date: "",
    instructions: "",
    usage_rights: "",
    paid_media_rights: false,
    exclusivity_requirements: "",
    approval_required: true,
    notes: "",
  });

  return (
    <div className="card space-y-4 p-6">
      {!campaignId ? <p className="text-sm text-status-warning">Saving the campaign…</p> : null}
      {templates.length > 0 ? (
        <ul className="divide-y divide-line rounded-sm border border-line">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center justify-between p-3 text-sm">
              <span>
                {t.quantity}x {t.content_type.replace(/_/g, " ")} ({t.platform})
              </span>
              <button type="button" className="text-status-danger" onClick={() => onRemove(t.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-soft">No deliverable requirements added yet.</p>
      )}

      <div className="grid grid-cols-3 gap-3 border-t border-line pt-4">
        <select className="input" value={draft.platform} onChange={(e) => setDraft({ ...draft, platform: e.target.value as SocialPlatform })}>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={draft.content_type}
          onChange={(e) => setDraft({ ...draft, content_type: e.target.value as (typeof CONTENT_TYPES)[number] })}
        >
          {CONTENT_TYPES.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          className="input"
          value={draft.quantity}
          onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) || 1 })}
        />
        <input
          type="date"
          className="input"
          value={draft.default_due_date}
          onChange={(e) => setDraft({ ...draft, default_due_date: e.target.value })}
        />
        <input
          className="input col-span-2"
          placeholder="Instructions"
          value={draft.instructions}
          onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
        />
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={draft.approval_required}
            onChange={(e) => setDraft({ ...draft, approval_required: e.target.checked })}
          />
          Approval required
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={draft.paid_media_rights}
            onChange={(e) => setDraft({ ...draft, paid_media_rights: e.target.checked })}
          />
          Paid media rights
        </label>
        <button type="button" className="btn-secondary" disabled={!campaignId} onClick={() => onAdd(draft)}>
          Add deliverable
        </button>
      </div>
    </div>
  );
}

function CreatorSelectionStep({
  campaignId,
  recommended,
  decidedCreatorIds,
  onDecide,
}: {
  campaignId: string | null;
  recommended: RecommendedCreator[] | null;
  decidedCreatorIds: Set<string>;
  onDecide: (id: string) => void;
}) {
  if (!campaignId) return <p className="card p-6 text-sm text-ink-soft">Saving the campaign…</p>;
  if (recommended === null) return <p className="card p-6 text-sm text-ink-soft">Finding matches…</p>;
  if (recommended.length === 0) {
    return (
      <p className="card p-6 text-sm text-ink-soft">
        No matching creators yet — you can adjust requirements or select creators later from the campaign&apos;s
        Creators tab.
      </p>
    );
  }

  return (
    <div className="card divide-y divide-line">
      {recommended.slice(0, 20).map((r) => {
        const match = { score: r.matchScore, breakdown: r.breakdown, reasons: [...r.strengths, ...r.concerns] };
        const decided = decidedCreatorIds.has(r.creatorId);
        return (
          <div key={r.creatorId} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-ink">
                {r.displayName} <span className="text-ink-soft">— {r.matchScore} match</span>
                {r.eligibility === "partial" ? (
                  <span className="badge ml-2 border-status-warning/30 text-status-warning">Partial match</span>
                ) : null}
              </p>
              <p className="text-xs text-ink-soft">
                {r.city ?? r.country ?? "Unknown location"} · {formatCompactNumber(r.followers)} followers ·{" "}
                {formatPercent(r.engagementRate)} ER
              </p>
            </div>
            {decided ? (
              <span className="text-xs text-ink-soft">Saved</span>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary py-1"
                  onClick={async () => {
                    await shortlistCampaignCreator(campaignId, r.creatorId, match);
                    onDecide(r.creatorId);
                  }}
                >
                  Shortlist
                </button>
                <button
                  type="button"
                  className="btn-primary py-1"
                  onClick={async () => {
                    await selectCampaignCreator(campaignId, r.creatorId, match);
                    onDecide(r.creatorId);
                  }}
                >
                  Select
                </button>
                <button
                  type="button"
                  className="btn-secondary py-1 text-status-danger"
                  onClick={async () => {
                    await rejectCampaignCreator(campaignId, r.creatorId, match);
                    onDecide(r.creatorId);
                  }}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
