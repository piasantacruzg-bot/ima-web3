import { formatDate } from "@/lib/format";
import type { CreatorNoteWithAuthor } from "@/lib/creators";

export function NotesSection({
  notes,
  addAction,
}: {
  notes: CreatorNoteWithAuthor[];
  addAction: (formData: FormData) => void;
}) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
        Internal notes
      </h2>
      <form action={addAction} className="mb-4 flex gap-2">
        <input
          name="body"
          placeholder="Add a note (e.g. 'Strong for beauty campaigns')"
          className="input"
          required
        />
        <button type="submit" className="btn-secondary shrink-0">
          Add
        </button>
      </form>
      {notes.length === 0 ? (
        <p className="text-sm text-ink-soft">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
              <p className="text-sm text-ink">{note.body}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {note.author_name ?? "Unknown"} · {formatDate(note.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
