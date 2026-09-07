-- Supabase Storage buckets (sections 14, 19). Both are private — files are
-- served through signed URLs generated server-side, never made public.

insert into storage.buckets (id, name, public)
values
  ('creator-avatars', 'creator-avatars', false),
  ('story-screenshots', 'story-screenshots', false),
  ('import-uploads', 'import-uploads', false)
on conflict (id) do nothing;

create policy storage_creator_avatars_select on storage.objects
  for select using (bucket_id = 'creator-avatars' and is_staff());
create policy storage_creator_avatars_write on storage.objects
  for insert with check (bucket_id = 'creator-avatars' and is_manager_or_admin());
create policy storage_creator_avatars_update on storage.objects
  for update using (bucket_id = 'creator-avatars' and is_manager_or_admin());
create policy storage_creator_avatars_delete on storage.objects
  for delete using (bucket_id = 'creator-avatars' and is_admin());

create policy storage_story_screenshots_select on storage.objects
  for select using (bucket_id = 'story-screenshots' and is_staff());
create policy storage_story_screenshots_write on storage.objects
  for insert with check (bucket_id = 'story-screenshots' and is_staff());
create policy storage_story_screenshots_delete on storage.objects
  for delete using (bucket_id = 'story-screenshots' and is_admin());

create policy storage_import_uploads_select on storage.objects
  for select using (bucket_id = 'import-uploads' and is_manager_or_admin());
create policy storage_import_uploads_write on storage.objects
  for insert with check (bucket_id = 'import-uploads' and is_manager_or_admin());
create policy storage_import_uploads_delete on storage.objects
  for delete using (bucket_id = 'import-uploads' and is_admin());
