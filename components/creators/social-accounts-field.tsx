"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { parseSocialProfileUrl } from "@/lib/social/parse-url";
import type { SocialPlatform } from "@/types/database";

export interface SocialAccountRow {
  platform: SocialPlatform;
  username: string;
  profile_url: string;
  followers: string;
  following: string;
  posts_count: string;
  engagement_rate: string;
  average_likes: string;
  average_comments: string;
  average_views: string;
  average_shares: string;
  average_saves: string;
  estimated_reach: string;
}

function emptyRow(): SocialAccountRow {
  return {
    platform: "instagram",
    username: "",
    profile_url: "",
    followers: "",
    following: "",
    posts_count: "",
    engagement_rate: "",
    average_likes: "",
    average_comments: "",
    average_views: "",
    average_shares: "",
    average_saves: "",
    estimated_reach: "",
  };
}

const PLATFORMS: SocialPlatform[] = ["instagram", "tiktok", "x", "youtube", "facebook", "other"];
const METRIC_FIELDS: { key: keyof SocialAccountRow; label: string }[] = [
  { key: "followers", label: "Followers" },
  { key: "following", label: "Following" },
  { key: "posts_count", label: "Posts" },
  { key: "engagement_rate", label: "Engagement %" },
  { key: "average_likes", label: "Avg. likes" },
  { key: "average_comments", label: "Avg. comments" },
  { key: "average_views", label: "Avg. views" },
  { key: "average_shares", label: "Avg. shares" },
  { key: "average_saves", label: "Avg. saves" },
  { key: "estimated_reach", label: "Est. reach" },
];

export function SocialAccountsField({ name = "social_accounts_json" }: { name?: string }) {
  const [rows, setRows] = useState<SocialAccountRow[]>([]);
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  function update(index: number, patch: Partial<SocialAccountRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addFromUrl() {
    const parsed = parseSocialProfileUrl(pasteUrl);
    if (!parsed) {
      setPasteError("Couldn't identify a platform/username from that URL.");
      return;
    }
    setRows((prev) => [
      ...prev,
      { ...emptyRow(), platform: parsed.platform, username: parsed.username, profile_url: parsed.profileUrl },
    ]);
    setPasteUrl("");
    setPasteError(null);
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />

      <div className="mb-3 flex gap-2">
        <input
          value={pasteUrl}
          onChange={(e) => setPasteUrl(e.target.value)}
          placeholder="Paste a profile URL (instagram.com/username, tiktok.com/@username…)"
          className="input"
        />
        <button type="button" onClick={addFromUrl} className="btn-secondary shrink-0">
          <Plus size={14} strokeWidth={1.75} />
          Add
        </button>
      </div>
      {pasteError ? <p className="mb-3 text-xs text-status-danger">{pasteError}</p> : null}

      {rows.length === 0 ? (
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
          className="btn-secondary"
        >
          <Plus size={14} strokeWidth={1.75} />
          Add account manually
        </button>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="card p-3">
              <div className="mb-2 flex items-center gap-2">
                <select
                  value={row.platform}
                  onChange={(e) => update(i, { platform: e.target.value as SocialPlatform })}
                  className="input w-auto"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p[0].toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
                <input
                  value={row.username}
                  onChange={(e) => update(i, { username: e.target.value })}
                  placeholder="username"
                  className="input"
                />
                <input
                  value={row.profile_url}
                  onChange={(e) => update(i, { profile_url: e.target.value })}
                  placeholder="Profile URL (optional)"
                  className="input"
                />
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                  className="shrink-0 rounded-sm border border-line p-2 text-ink-soft hover:border-status-danger/40 hover:text-status-danger"
                  aria-label="Remove account"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {METRIC_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <label className="mb-0.5 block text-[10px] uppercase tracking-wide text-ink-soft">
                      {label}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={row[key]}
                      onChange={(e) => update(i, { [key]: e.target.value } as Partial<SocialAccountRow>)}
                      className="input px-2 py-1 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, emptyRow()])}
            className="btn-secondary"
          >
            <Plus size={14} strokeWidth={1.75} />
            Add another account
          </button>
        </div>
      )}
    </div>
  );
}
