-- DÁBLIO | Atualizações do banco para as novas funcionalidades
-- Execute este arquivo uma única vez no Supabase > SQL Editor.
-- As instruções são idempotentes e podem ser executadas mesmo se algumas partes já existirem.

-- 1. Serviço contratado e link externo de vídeo por cliente
alter table public.clients
  add column if not exists service text not null default 'Fotografia',
  add column if not exists video_url text;

-- 2. Bucket público exclusivo do vídeo demonstrativo da página inicial
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

-- 3. Limite de frequência do formulário de contato (4 envios por IP a cada 15 minutos)
create table if not exists public.contact_rate_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 1
);
alter table public.contact_rate_limits enable row level security;

create or replace function public.allow_contact_submission(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts integer;
begin
  insert into public.contact_rate_limits (ip_hash, window_started_at, attempts)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update
  set
    attempts = case
      when public.contact_rate_limits.window_started_at < now() - interval '15 minutes' then 1
      else public.contact_rate_limits.attempts + 1
    end,
    window_started_at = case
      when public.contact_rate_limits.window_started_at < now() - interval '15 minutes' then now()
      else public.contact_rate_limits.window_started_at
    end
  returning attempts into v_attempts;
  return v_attempts <= 4;
end;
$$;
revoke all on function public.allow_contact_submission(text) from public;
grant execute on function public.allow_contact_submission(text) to service_role;

-- 4. Apresentação editável e depoimentos de clientes
create table if not exists public.site_profile (
  id integer primary key check (id = 1),
  about_title text not null default 'Sobre mim',
  about_text text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.site_profile (id) values (1) on conflict (id) do nothing;

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  quote text not null,
  visible boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.site_profile enable row level security;
alter table public.testimonials enable row level security;

drop policy if exists "admin gerencia apresentação" on public.site_profile;
create policy "admin gerencia apresentação" on public.site_profile
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "apresentação é pública" on public.site_profile;
create policy "apresentação é pública" on public.site_profile
  for select using (true);

drop policy if exists "admin gerencia depoimentos" on public.testimonials;
create policy "admin gerencia depoimentos" on public.testimonials
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "depoimentos publicados são públicos" on public.testimonials;
create policy "depoimentos publicados são públicos" on public.testimonials
  for select using (visible = true);

grant select on public.site_profile to anon, authenticated;
grant select on public.testimonials to anon, authenticated;
grant insert, update, delete on public.site_profile, public.testimonials to authenticated;
