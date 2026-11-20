-- DÁBLIO | Auditoria de segurança somente leitura
-- Execute no Supabase SQL Editor e confira os resultados.
-- Este arquivo NÃO altera dados, políticas ou permissões.

-- 1. Tabelas públicas e status de RLS.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

-- 2. Políticas RLS do schema public.
select schemaname, tablename, policyname, permissive,
       roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3. Políticas do Storage.
select schemaname, tablename, policyname, permissive,
       roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- 4. Buckets, visibilidade, limites e formatos permitidos.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('galerias', 'portfolio', 'site-demo')
order by id;

-- 5. Privilégios concedidos às roles de aplicação nas tabelas sensíveis.
select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in (
    'admins', 'clients', 'photos', 'messages', 'photo_favorites',
    'client_contracts', 'finance_payments', 'appointments',
    'testimonials', 'contact_rate_limits'
  )
order by table_name, grantee, privilege_type;

-- 6. Funções SECURITY DEFINER e search_path configurado.
select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       p.proconfig as function_settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by p.proname;
