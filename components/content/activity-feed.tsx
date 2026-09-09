import { formatDateTime } from "@/lib/format";
import { humanizeAction, type ActivityEntry } from "@/lib/activity";

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-ink-soft">No activity recorded yet.</p>;
  }

  return (
    <ul className="card divide-y divide-line text-sm">
      {entries.map((e) => (
        <li key={e.id} className="px-4 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-ink">{humanizeAction(e.action)}</span>
            <span className="text-xs text-ink-soft">{formatDateTime(e.created_at)}</span>
          </div>
          <p className="mt-0.5 text-xs text-ink-soft">{e.actorName}</p>
        </li>
      ))}
    </ul>
  );
}
