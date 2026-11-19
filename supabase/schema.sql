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
