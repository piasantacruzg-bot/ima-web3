import { createClient } from "@/lib/supabase/server";

const BUCKET_PREFIX = "creator-avatars/";
const SIGNED_URL_TTL_SECONDS = 3600;

// creators.profile_image_url stores either a plain external URL (pasted
// in, or imported from a spreadsheet) or a "creator-avatars/<path>"
// marker pointing at a private Storage object. Resolve the latter to a
// short-lived signed URL at render time — never store an expiring URL in
// the database.
export async function resolveCreatorAvatarUrl(
  value: string | null | undefined
): Promise<string | null> {
  if (!value) return null;
  if (!value.startsWith(BUCKET_PREFIX)) return value;

  const objectPath = value.slice(BUCKET_PREFIX.length);
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("creator-avatars")
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  return data?.signedUrl ?? null;
}

export async function resolveCreatorAvatarUrls<T extends { profile_image_url: string | null }>(
  rows: T[]
): Promise<(T & { avatarUrl: string | null })[]> {
  return Promise.all(
    rows.map(async (row) => ({ ...row, avatarUrl: await resolveCreatorAvatarUrl(row.profile_image_url) }))
  );
}
