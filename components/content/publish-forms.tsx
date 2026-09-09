"use client";

import { useState, useTransition } from "react";
import { publishDeliverable, publishStoryInstance } from "@/app/(app)/content/actions";

export function PublishDeliverableForm({ deliverableId }: { deliverableId: string }) {
  const [postUrl, setPostUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!postUrl.trim()) {
      setError("A public post URL is required to publish a Reel, post, or video.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await publishDeliverable(deliverableId, { postUrl: postUrl.trim(), caption: caption || undefined });
      if (res.error) setError(res.error);
      else {
        setPostUrl("");
        setCaption("");
      }
    });
  }

  return (
    <div className="space-y-2">
      <input className="input" placeholder="https://instagram.com/p/…" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} />
      <input className="input" placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
      <button type="button" className="btn-primary" disabled={pending} onClick={submit}>
        {pending ? "Publishing…" : "Mark published"}
      </button>
      {error ? <p className="text-xs text-status-danger">{error}</p> : null}
    </div>
  );
}

// A Story never needs a public URL to be marked published — evidence +
// metrics are enough (spec section 29). The URL field here is optional.
export function PublishStoryForm({ storyInstanceId }: { storyInstanceId: string }) {
  const [contentUrl, setContentUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await publishStoryInstance(storyInstanceId, {
        contentUrl: contentUrl || undefined,
        caption: caption || undefined,
      });
      if (res.error) setError(res.error);
      else {
        setContentUrl("");
        setCaption("");
      }
    });
  }

  return (
    <div className="space-y-2">
      <input
        className="input"
        placeholder="Public URL (optional — not required for Stories)"
        value={contentUrl}
        onChange={(e) => setContentUrl(e.target.value)}
      />
      <input className="input" placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
      <button type="button" className="btn-primary" disabled={pending} onClick={submit}>
        {pending ? "Publishing…" : "Mark published"}
      </button>
      {error ? <p className="text-xs text-status-danger">{error}</p> : null}
    </div>
  );
}
