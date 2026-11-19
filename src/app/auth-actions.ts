'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { emailDoCliente, normalizarCodigo } from '@/lib/auth';

export type LoginState = { error?: string } | undefined;

export async function loginCliente(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const codigo = normalizarCodigo(String(formData.get('codigo') ?? ''));
  const senha = String(formData.get('senha') ?? '');
  if (!codigo || !senha) return { error: 'Informe o código e a senha.' };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: emailDoCliente(codigo),
    password: senha,
  });
  if (error) return { error: 'Código ou senha incorretos.' };

  redirect('/cliente');
}

export async function loginAdmin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const senha = String(formData.get('senha') ?? '');
  if (!email || !senha) return { error: 'Informe e-mail e senha.' };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error || !data.user) return { error: 'E-mail ou senha incorretos.' };

  const { data: admin } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return { error: 'Esta conta não tem acesso ao painel.' };
  }

  redirect('/admin');
}

export async function sair() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/');
}
