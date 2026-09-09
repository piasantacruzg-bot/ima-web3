"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, FileCheck, Link as LinkIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addEvidence } from "@/app/(app)/content/actions";
import { formatDateTime } from "@/lib/format";
import type { EvidenceType } from "@/types/database";

const EVIDENCE_TYPE_LABEL: Record<EvidenceType, string> = {
  public_url: "Public URL",
  screenshot: "Screenshot",
  uploaded_file: "Uploaded file",
  google_drive: "Google Drive",
  other: "Other",
};

export interface EvidenceRow {
  id: string;
  evidenceType: EvidenceType;
  fileUrl: string | null;
  screenshotUrl: string | null;
  driveUrl: string | null;
  filename: string | null;
  signedUrl: string | null;
  uploadedAt: string;
  notes: string | null;
}

export function EvidencePanel({
  evidence,
  deliverableId,
  contentPostId,
  storyInstanceId,
}: {
  evidence: EvidenceRow[];
  deliverableId?: string;
  contentPostId?: string;
  storyInstanceId?: string;
}) {
  return (
    <div className="space-y-3">
      {evidence.length === 0 ? (
        <p className="text-xs text-ink-soft">No evidence recorded yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {evidence.map((ev) => {
            const href = ev.fileUrl ?? ev.driveUrl ?? ev.signedUrl ?? ev.screenshotUrl ?? null;
            return (
              <li key={ev.id} className="flex items-center gap-2 text-xs">
                <span className="badge">{EVIDENCE_TYPE_LABEL[ev.evidenceType]}</span>
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-ink underline">
                    {ev.evidenceType === "uploaded_file" || ev.evidenceType === "screenshot" ? (
                      <FileCheck size={12} strokeWidth={1.75} />
                    ) : (
                      <LinkIcon size={12} strokeWidth={1.75} />
                    )}
                    {ev.filename || "View"}
                  </a>
                ) : (
                  <span className="text-ink-soft">No link stored</span>
                )}
                <span className="text-ink-soft">{formatDateTime(ev.uploadedAt)}</span>
                {ev.notes ? <span className="text-ink-soft">— {ev.notes}</span> : null}
              </li>
            );
          })}
        </ul>
      )}
      <AddEvidenceForm deliverableId={deliverableId} contentPostId={contentPostId} storyInstanceId={storyInstanceId} />
    </div>
  );
}

function AddEvidenceForm({
  deliverableId,
  contentPostId,
  storyInstanceId,
}: {
  deliverableId?: string;
  contentPostId?: string;
  storyInstanceId?: string;
}) {
  const [type, setType] = useState<EvidenceType>("public_url");
  const [urlValue, setUrlValue] = useState("");
  const [storagePath, setStoragePath] = useState("");
  const [fileName, setFileName] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "bin";
      const parentId = deliverableId ?? contentPostId ?? storyInstanceId ?? "misc";
      const path = `${parentId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("content-evidence")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      setStoragePath(path);
      setFileName(file.name);
    } catch {
      setError("Couldn't upload the file.");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    setError(null);
    if (type === "public_url" && !urlValue.trim()) {
      setError("Enter a public URL.");
      return;
    }
    if (type === "google_drive" && !urlValue.trim()) {
      setError("Paste a Drive share link — automatic upload lands with a real Drive connection later.");
      return;
    }
    if ((type === "screenshot" || type === "uploaded_file") && !storagePath) {
      setError("Upload a file first.");
      return;
    }

    startTransition(async () => {
      const res = await addEvidence({
        deliverableId,
        contentPostId,
        storyInstanceId,
        evidenceType: type,
        fileUrl: type === "public_url" ? urlValue.trim() : undefined,
        driveUrl: type === "google_drive" ? urlValue.trim() : undefined,
        storagePath: type === "screenshot" || type === "uploaded_file" ? storagePath : undefined,
        filename: fileName || undefined,
        notes: notes || undefined,
      });
      if ("error" in res) setError(res.error);
      else {
        setUrlValue("");
        setStoragePath("");
        setFileName("");
        setNotes("");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-line pt-2">
      <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value as EvidenceType)}>
        {Object.entries(EVIDENCE_TYPE_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {type === "public_url" || type === "google_drive" ? (
        <input
          className="input min-w-[220px] flex-1"
          placeholder={type === "google_drive" ? "Drive share link" : "https://…"}
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
        />
      ) : (
        <>
          <button type="button" className="btn-secondary py-1.5" disabled={uploading} onClick={() => inputRef.current?.click()}>
            <Upload size={13} strokeWidth={1.75} />
            {uploading ? "Uploading…" : fileName || "Choose file"}
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </>
      )}

      <input className="input min-w-[140px] flex-1" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button type="button" className="btn-secondary py-1.5" disabled={pending || uploading} onClick={submit}>
        {pending ? "Saving…" : "Add evidence"}
      </button>
      {error ? <p className="w-full text-xs text-status-danger">{error}</p> : null}
    </div>
  );
}
