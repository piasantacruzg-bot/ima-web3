import { X } from "lucide-react";

export function TagsSection({
  tags,
  allTags,
  addAction,
  removeAction,
}: {
  tags: { id: string; name: string }[];
  allTags: { id: string; name: string }[];
  addAction: (formData: FormData) => void;
  removeAction: (tagId: string) => void;
}) {
  const suggestions = allTags.filter((t) => !tags.some((assigned) => assigned.id === t.id));

  return (
    <section className="card p-4">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Tags</h2>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {tags.length === 0 ? (
          <p className="text-sm text-ink-soft">No tags yet.</p>
        ) : (
          tags.map((tag) => (
            <span key={tag.id} className="badge border-line text-ink-soft">
              {tag.name}
              <form action={removeAction.bind(null, tag.id)} className="inline">
                <button type="submit" aria-label={`Remove ${tag.name}`} className="ml-1 text-ink-soft/60 hover:text-status-danger">
                  <X size={10} strokeWidth={2} />
                </button>
              </form>
            </span>
          ))
        )}
      </div>
      <form action={addAction} className="flex gap-2">
        <input
          name="tag_name"
          list="existing-tags"
          placeholder="Add a tag (e.g. VIP, Miami, UGC)"
          className="input"
          required
        />
        <datalist id="existing-tags">
          {suggestions.map((t) => (
            <option key={t.id} value={t.name} />
          ))}
        </datalist>
        <button type="submit" className="btn-secondary shrink-0">
          Add
        </button>
      </form>
    </section>
  );
}
