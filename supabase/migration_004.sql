-- Partner avatar storage. Applied to Supabase production.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin avatar uploads" on storage.objects;
create policy "Admin avatar uploads" on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'owner'));

drop policy if exists "Admin avatar reads" on storage.objects;
create policy "Admin avatar reads" on storage.objects for select to authenticated
using (bucket_id = 'avatars' and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'owner'));

drop policy if exists "Admin avatar updates" on storage.objects;
create policy "Admin avatar updates" on storage.objects for update to authenticated
using (bucket_id = 'avatars' and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'owner'))
with check (bucket_id = 'avatars' and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'owner'));

drop policy if exists "Admin avatar deletes" on storage.objects;
create policy "Admin avatar deletes" on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'owner'));
