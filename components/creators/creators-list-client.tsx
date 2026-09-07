"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Archive, Tag as TagIcon } from "lucide-react";
import { CreatorsTable, type CreatorRowWithAvatar } from "@/components/creators/creators-table";
import { bulkArchive, bulkAddTag, bulkChangeStatus } from "@/app/(app)/creators/actions";
import type { CreatorStatus } from "@/types/database";

export function CreatorsListClient({ creators }: { creators: CreatorRowWithAvatar[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const searchParams = useSearchParams();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(creators.map((c) => c.id)) : new Set());
  }

  function runBulk(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      setSelected(new Set());
    });
  }

  const exportHref = (format: "csv" | "xlsx") =>
    `/api/creators/export?${searchParams.toString()}${searchParams.toString() ? "&" : ""}format=${format}`;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          {selected.size > 0 ? (
            <div className="flex items-center gap-2 rounded-sm border border-line bg-paper-raised px-3 py-1.5">
              <span className="text-sm text-ink">{selected.size} selected</span>
              <select
                disabled={pending}
                defaultValue=""
                onChange={(e) => {
                  const status = e.target.value as CreatorStatus;
                  if (status) runBulk(() => bulkChangeStatus([...selected], status));
                  e.target.value = "";
                }}
                className="input w-auto py-1 text-xs"
              >
                <option value="" disabled>
                  Change status…
                </option>
                <option value="prospect">Prospect</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="do_not_work_with">Do not work with</option>
              </select>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const tag = prompt("Tag name to add to all selected creators:");
                  if (tag) runBulk(() => bulkAddTag([...selected], tag));
                }}
                className="btn-secondary py-1 text-xs"
              >
                <TagIcon size={12} strokeWidth={1.75} />
                Add tag
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (confirm(`Archive ${selected.size} creator(s)? This can be undone from each profile.`)) {
                    runBulk(() => bulkArchive([...selected]));
                  }
                }}
                className="btn-secondary py-1 text-xs"
              >
                <Archive size={12} strokeWidth={1.75} />
                Archive
              </button>
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <a href={exportHref("csv")} className="btn-secondary text-xs">
            <Download size={13} strokeWidth={1.75} />
            Export CSV
          </a>
          <a href={exportHref("xlsx")} className="btn-secondary text-xs">
            <Download size={13} strokeWidth={1.75} />
            Export XLSX
          </a>
        </div>
      </div>

      <CreatorsTable
        creators={creators}
        selectedIds={selected}
        onToggle={toggle}
        onToggleAll={toggleAll}
      />
    </div>
  );
}
