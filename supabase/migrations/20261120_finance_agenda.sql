-- DÁBLIO | Fases 2 e 3: financeiro manual e agenda
-- Execute no Supabase SQL Editor. Seguro para reexecução.

create table if not exists public.client_contracts (
  client_id uuid primary key references public.clients(id) on delete cascade,
  contract_value numeric(12,2) not null default 0 check (contract_value >= 0),
  updated_at timestamptz not null default now()
);
alter table public.client_contracts enable row level security;
drop policy if exists "admin gerencia contratos" on public.client_contracts;
create policy "admin gerencia contratos" on public.client_contracts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.client_contracts to authenticated;

create table if not exists public.finance_payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('Pix','Dinheiro','Cartão','Transferência','Outro')),
  paid_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists finance_payments_client_idx on public.finance_payments(client_id);
create index if not exists finance_payments_paid_at_idx on public.finance_payments(paid_at desc);
alter table public.finance_payments enable row level security;
drop policy if exists "admin gerencia pagamentos" on public.finance_payments;
create policy "admin gerencia pagamentos" on public.finance_payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.finance_payments to authenticated;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null default 'Ensaio',
  starts_at timestamptz not null,
  location text not null,
  service text not null default 'Fotografia',
  notes text,
  status text not null default 'agendado'
    check (status in ('agendado','concluido','cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists appointments_starts_at_idx on public.appointments(starts_at);
create index if not exists appointments_client_idx on public.appointments(client_id);
alter table public.appointments enable row level security;
drop policy if exists "admin gerencia agenda" on public.appointments;
create policy "admin gerencia agenda" on public.appointments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "cliente consulta próprios agendamentos" on public.appointments;
create policy "cliente consulta próprios agendamentos" on public.appointments
  for select to authenticated using (
    status <> 'cancelado' and exists (
      select 1 from public.clients c
      where c.id = appointments.client_id and c.user_id = auth.uid()
        and c.expires_at > now()
    )
  );
grant select, insert, update, delete on public.appointments to authenticated;

-- Atualiza timestamp quando um agendamento é alterado.
create or replace function public.set_appointments_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists appointments_updated_at on public.appointments;
create trigger appointments_updated_at before update on public.appointments
for each row execute function public.set_appointments_updated_at();
