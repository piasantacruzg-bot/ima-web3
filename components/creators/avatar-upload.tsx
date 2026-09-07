"use client";

import { useRef, useState } from "react";
import { Upload, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AvatarUpload({
  initialUrl,
  name = "profile_image_url",
}: {
  initialUrl?: string | null;
  name?: string;
}) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [storedValue, setStoredValue] = useState(initialUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    setPreview(URL.createObjectURL(file));

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("creator-avatars")
        .upload(path, file, { contentType: file.type });

      if (uploadError) throw uploadError;
      setStoredValue(`creator-avatars/${path}`);
    } catch {
      setError("Couldn't upload image. You can still save without one.");
      setPreview(initialUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name={name} value={storedValue} />
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-line bg-line-soft">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not an optimizable remote image
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <User size={22} strokeWidth={1.5} className="text-ink-soft" />
        )}
      </div>
      <div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="btn-secondary"
        >
          <Upload size={14} strokeWidth={1.75} />
          {uploading ? "Uploading…" : "Upload photo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {error ? <p className="mt-1 text-xs text-status-danger">{error}</p> : null}
      </div>
    </div>
  );
}
