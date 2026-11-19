-- Dáblio | Estrutura do banco de dados e regras de segurança
-- Cole este arquivo inteiro em Supabase > SQL Editor > Run

create extension if not exists pgcrypto;

-- ============ TABELAS ============

-- Quem é administrador (você)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Clientes com acesso à área reservada
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  code text unique not null,
  name text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Fotos de cada cliente (os arquivos ficam no Storage)
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);
create index if not exists photos_client_idx on public.photos(client_id);

-- Mensagens enviadas pelo formulário de contato
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  service text,
  message text not null,
  created_at timestamptz not null default now()
);

-- ============ FUNÇÃO AUXILIAR ============

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ============ SEGURANÇA (RLS) ============

alter table public.admins   enable row level security;
alter table public.clients  enable row level security;
alter table public.photos   enable row level security;
alter table public.messages enable row level security;

drop policy if exists "admin lê admins" on public.admins;
create policy "admin lê admins" on public.admins
  for select using (user_id = auth.uid());

drop policy if exists "admin gerencia clientes" on public.clients;
create policy "admin gerencia clientes" on public.clients
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "cliente lê o próprio cadastro" on public.clients;
create policy "cliente lê o próprio cadastro" on public.clients
  for select using (user_id = auth.uid());

drop policy if exists "admin gerencia fotos" on public.photos;
create policy "admin gerencia fotos" on public.photos
  for all using (public.is_admin()) with check (public.is_admin());

-- O cliente só enxerga as próprias fotos E somente enquanto o acesso não expirou
drop policy if exists "cliente lê fotos com acesso válido" on public.photos;
create policy "cliente lê fotos com acesso válido" on public.photos
  for select using (
    exists (
      select 1 from public.clients c
      where c.id = photos.client_id
        and c.user_id = auth.uid()
        and c.expires_at > now()
    )
  );

drop policy if exists "admin gerencia mensagens" on public.messages;
create policy "admin gerencia mensagens" on public.messages
  for all using (public.is_admin()) with check (public.is_admin());

-- ============ ARMAZENAMENTO (fotos) ============

-- galerias: privado (fotos dos clientes) | portfolio: público (fotos do site)
insert into storage.buckets (id, name, public)
values ('galerias', 'galerias', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

drop policy if exists "admin gerencia galerias" on storage.objects;
create policy "admin gerencia galerias" on storage.objects
  for all
  using (bucket_id = 'galerias' and public.is_admin())
  with check (bucket_id = 'galerias' and public.is_admin());

-- Cada cliente só lê arquivos da pasta com o id dele e com acesso dentro da validade
drop policy if exists "cliente lê a própria galeria" on storage.objects;
create policy "cliente lê a própria galeria" on storage.objects
  for select using (
    bucket_id = 'galerias'
    and exists (
      select 1 from public.clients c
      where c.user_id = auth.uid()
        and c.expires_at > now()
        and (storage.foldername(name))[1] = c.id::text
    )
  );

drop policy if exists "admin gerencia portfolio" on storage.objects;
create policy "admin gerencia portfolio" on storage.objects
  for all
  using (bucket_id = 'portfolio' and public.is_admin())
  with check (bucket_id = 'portfolio' and public.is_admin());

drop policy if exists "portfolio é público" on storage.objects;
create policy "portfolio é público" on storage.objects
  for select using (bucket_id = 'portfolio');


-- ============ ATUALIZAÇÕES: VÍDEOS, CONTEÚDO E CONTATO ============

alter table public.clients
  add column if not exists service text not null default 'Fotografia',
  add column if not exists video_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-demo', 'site-demo', true, 52428800, array['video/mp4'])
on conflict (id) do update
set public = true, file_size_limit = 52428800, allowed_mime_types = array['video/mp4'];

drop policy if exists "admin gerencia site-demo" on storage.objects;
create policy "admin gerencia site-demo" on storage.objects
  for all using (bucket_id = 'site-demo' and public.is_admin())
  with check (bucket_id = 'site-demo' and public.is_admin());

drop policy if exists "site demo é público" on storage.objects;
create policy "site demo é público" on storage.objects
  for select using (bucket_id = 'site-demo');

create table if not exists public.contact_rate_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 1
);
alter table public.contact_rate_limits enable row level security;

create or replace function public.allow_contact_submission(p_ip_hash text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_attempts integer;
begin
  insert into public.contact_rate_limits (ip_hash, window_started_at, attempts)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update
  set attempts = case when public.contact_rate_limits.window_started_at < now() - interval '15 minutes' then 1 else public.contact_rate_limits.attempts + 1 end,
      window_started_at = case when public.contact_rate_limits.window_started_at < now() - interval '15 minutes' then now() else public.contact_rate_limits.window_started_at end
  returning attempts into v_attempts;
  return v_attempts <= 4;
end;
$$;
revoke all on function public.allow_contact_submission(text) from public;
grant execute on function public.allow_contact_submission(text) to service_role;

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
  client_id uuid references public.clients(id) on delete set null,
  consent boolean not null default false,
  consented_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists testimonials_one_per_client_idx
  on public.testimonials(client_id) where client_id is not null;

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

drop policy if exists "cliente envia depoimento autorizado" on public.testimonials;
create policy "cliente envia depoimento autorizado" on public.testimonials
  for insert to authenticated
  with check (
    consent = true and visible = false and client_id is not null
    and exists (
      select 1 from public.clients c
      where c.id = testimonials.client_id
        and c.user_id = auth.uid()
        and c.expires_at > now()
    )
  );

drop policy if exists "cliente consulta próprio depoimento" on public.testimonials;
create policy "cliente consulta próprio depoimento" on public.testimonials
  for select to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = testimonials.client_id
        and c.user_id = auth.uid()
    )
  );

grant select on public.site_profile to anon, authenticated;
grant select on public.testimonials to anon, authenticated;
grant insert, update, delete on public.site_profile, public.testimonials to authenticated;
