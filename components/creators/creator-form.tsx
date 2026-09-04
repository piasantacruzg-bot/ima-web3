"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { Creator } from "@/types/database";
import type { CreatorFormState } from "@/app/(app)/creators/actions";

const initialState: CreatorFormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Saving…" : label}
    </button>
  );
}

export function CreatorForm({
  action,
  creator,
  submitLabel = "Save creator",
}: {
  action: (state: CreatorFormState, formData: FormData) => Promise<CreatorFormState>;
  creator?: Creator;
  submitLabel?: string;
}) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="space-y-8">
      {state.error ? (
        <p className="rounded-sm border border-status-danger/30 bg-status-danger/5 px-3 py-2 text-sm text-status-danger">
          {state.error}
        </p>
      ) : null}

      <section className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label" htmlFor="display_name">
            Display name *
          </label>
          <input
            id="display_name"
            name="display_name"
            required
            defaultValue={creator?.display_name}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="first_name">
            First name
          </label>
          <input
            id="first_name"
            name="first_name"
            defaultValue={creator?.first_name ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="last_name">
            Last name
          </label>
          <input
            id="last_name"
            name="last_name"
            defaultValue={creator?.last_name ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={creator?.email ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Phone
          </label>
          <input id="phone" name="phone" defaultValue={creator?.phone ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="country">
            Country
          </label>
          <input
            id="country"
            name="country"
            defaultValue={creator?.country ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="city">
            City
          </label>
          <input id="city" name="city" defaultValue={creator?.city ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="gender">
            Gender
          </label>
          <input id="gender" name="gender" defaultValue={creator?.gender ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="languages">
            Languages (comma-separated)
          </label>
          <input
            id="languages"
            name="languages"
            defaultValue={creator?.languages.join(", ") ?? ""}
            placeholder="English, Spanish"
            className="input"
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="categories">
            Categories (comma-separated)
          </label>
          <input
            id="categories"
            name="categories"
            defaultValue={creator?.categories.join(", ") ?? ""}
            placeholder="Lifestyle, Fashion"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="niches">
            Niches (comma-separated)
          </label>
          <input
            id="niches"
            name="niches"
            defaultValue={creator?.niches.join(", ") ?? ""}
            placeholder="outfits, day-in-the-life"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="creator_type">
            Creator type
          </label>
          <select
            id="creator_type"
            name="creator_type"
            defaultValue={creator?.creator_type ?? ""}
            className="input"
          >
            <option value="">—</option>
            <option value="nano">Nano</option>
            <option value="micro">Micro</option>
            <option value="mid">Mid</option>
            <option value="macro">Macro</option>
            <option value="mega">Mega</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={creator?.status ?? "prospect"}
            className="input"
          >
            <option value="prospect">Prospect</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="do_not_work_with">Do not work with</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="internal_rating">
            Internal rating (0–5)
          </label>
          <input
            id="internal_rating"
            name="internal_rating"
            type="number"
            min={0}
            max={5}
            step={0.1}
            defaultValue={creator?.internal_rating ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="brand_fit_score">
            Brand fit score (0–100)
          </label>
          <input
            id="brand_fit_score"
            name="brand_fit_score"
            type="number"
            min={0}
            max={100}
            defaultValue={creator?.brand_fit_score ?? ""}
            className="input"
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="manager_name">
            Manager name
          </label>
          <input
            id="manager_name"
            name="manager_name"
            defaultValue={creator?.manager_name ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="manager_email">
            Manager email
          </label>
          <input
            id="manager_email"
            name="manager_email"
            type="email"
            defaultValue={creator?.manager_email ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="agency_name">
            Agency name
          </label>
          <input
            id="agency_name"
            name="agency_name"
            defaultValue={creator?.agency_name ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="rate_card_notes">
            Rate card notes
          </label>
          <input
            id="rate_card_notes"
            name="rate_card_notes"
            defaultValue={creator?.rate_card_notes ?? ""}
            className="input"
          />
        </div>
      </section>

      <section>
        <label className="label" htmlFor="bio">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={creator?.bio ?? ""}
          className="input"
        />
      </section>

      <section>
        <label className="label" htmlFor="notes">
          Internal notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={creator?.notes ?? ""}
          className="input"
        />
      </section>

      <section>
        <label className="label" htmlFor="social_urls">
          {creator ? "Add more social profile URLs" : "Social profile URLs"}
        </label>
        <p className="mb-2 text-xs text-ink-soft">
          One per line — Instagram, TikTok, X, YouTube, or Facebook profile links. The platform
          and handle are detected automatically.
        </p>
        <textarea
          id="social_urls"
          name="social_urls"
          rows={4}
          placeholder={"https://instagram.com/username\nhttps://tiktok.com/@username"}
          className="input font-mono text-xs"
        />
        {creator ? (
          <p className="mt-1 text-xs text-ink-soft">
            Existing social accounts aren&apos;t editable here yet — this only adds new ones.
          </p>
        ) : null}
      </section>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
