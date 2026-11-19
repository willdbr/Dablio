-- Proteção contra envios repetidos no formulário de contato
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
