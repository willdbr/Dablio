-- Conteúdo editável da página inicial: apresentação e depoimentos
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
