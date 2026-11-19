-- Dáblio: links de vídeo por cliente e vídeo demonstrativo público
alter table public.clients
  add column if not exists service text not null default 'Fotografia',
  add column if not exists video_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-demo', 'site-demo', true, 52428800, array['video/mp4'])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = array['video/mp4'];

drop policy if exists "admin gerencia site-demo" on storage.objects;
create policy "admin gerencia site-demo" on storage.objects
  for all
  using (bucket_id = 'site-demo' and public.is_admin())
  with check (bucket_id = 'site-demo' and public.is_admin());

drop policy if exists "site demo é público" on storage.objects;
create policy "site demo é público" on storage.objects
  for select using (bucket_id = 'site-demo');
