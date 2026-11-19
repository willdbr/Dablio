import { randomInt } from 'node:crypto';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789'; // sem letras que se confundem (i, l, o, 0, 1)

function aleatorio(tamanho: number) {
  return Array.from({ length: tamanho }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
}

export const gerarCodigo = () => aleatorio(6);
export const gerarSenha = () => aleatorio(10);

export function normalizarCodigo(valor: string) {
  return valor.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
}

// O Supabase exige e-mail para login; o código do cliente vira um e-mail interno.
export function emailDoCliente(codigo: string) {
  const dominio = process.env.CLIENT_EMAIL_DOMAIN ?? 'clientes.dablio.com.br';
  return `${codigo}@${dominio}`;
}

// Garante que quem acessa é administrador. Caso contrário, manda para o login.
export async function exigirAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) redirect('/admin/login');

  return { supabase, user };
}
