"use client";

import type { CreatorStatus } from "@/types/database";

const STATUSES: { value: CreatorStatus; label: string }[] = [
  { value: "prospect", label: "Prospect" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "do_not_work_with", label: "Do not work with" },
];

export function StatusSelect({
  action,
  defaultValue,
}: {
  action: (formData: FormData) => void;
  defaultValue: CreatorStatus;
}) {
  return (
    <form
      action={action}
      onChange={(e) => e.currentTarget.requestSubmit()}
      className="inline-block"
    >
      <select name="status" defaultValue={defaultValue} className="input w-auto py-1 text-xs">
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </form>
  );
}
