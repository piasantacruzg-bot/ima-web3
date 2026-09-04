"use client";

import { useState } from "react";
import { Bookmark, ChevronDown, X } from "lucide-react";
import type { SavedCreatorFilter } from "@/types/database";
import { saveCreatorFilter, deleteSavedFilter } from "@/app/(app)/creators/actions";

export function SaveFilterButton({
  currentConfig,
  savedFilters,
  onApply,
}: {
  currentConfig: Record<string, string>;
  savedFilters: SavedCreatorFilter[];
  onApply: (config: Record<string, string>) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="btn-secondary">
        <Bookmark size={14} strokeWidth={1.75} />
        Saved filters
        <ChevronDown size={12} strokeWidth={1.75} />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-sm border border-line bg-paper-raised p-3 shadow-card">
          {savedFilters.length === 0 ? (
            <p className="mb-2 text-xs text-ink-soft">No saved filters yet.</p>
          ) : (
            <ul className="mb-3 space-y-1">
              {savedFilters.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      onApply(f.filter_config as Record<string, string>);
                      setOpen(false);
                    }}
                    className="flex-1 truncate text-left text-ink hover:underline"
                  >
                    {f.name}
                  </button>
                  <form action={deleteSavedFilter.bind(null, f.id)}>
                    <button
                      type="submit"
                      aria-label={`Delete ${f.name}`}
                      className="text-ink-soft/60 hover:text-status-danger"
                    >
                      <X size={13} strokeWidth={1.75} />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form
            action={saveCreatorFilter}
            className="flex gap-1.5 border-t border-line pt-2"
            onSubmit={() => setOpen(false)}
          >
            <input type="hidden" name="config" value={JSON.stringify(currentConfig)} />
            <input
              name="name"
              required
              placeholder="Name this filter combination"
              className="input py-1 text-xs"
            />
            <button type="submit" className="btn-secondary shrink-0 py-1 text-xs">
              Save
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
