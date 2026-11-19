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

  // Diagnóstico temporário: confirma a sessão recuperada pelo servidor.
  const { data: sessao, error: erroSessao } = await supabase.auth.getUser();
  if (erroSessao || !sessao.user) {
    return {
      error: `Diagnóstico: login aceito, mas a sessão não foi recuperada no servidor. ${erroSessao?.message ?? 'Usuário da sessão ausente.'}`,
    };
  }

  if (sessao.user.id !== data.user.id) {
    return { error: 'Diagnóstico: o ID da sessão não corresponde ao usuário autenticado no login.' };
  }

  const { data: admin, error: erroAdmin } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', sessao.user.id)
    .maybeSingle();

  if (erroAdmin) {
    return {
      error: `Diagnóstico: sessão válida, mas a consulta à tabela admins falhou (${erroAdmin.code ?? 'sem código'}): ${erroAdmin.message}`,
    };
  }

  if (!admin) {
    await supabase.auth.signOut();
    return { error: 'Diagnóstico: sessão válida e consulta executada, mas nenhum registro correspondente foi encontrado em admins.' };
  }

  redirect('/admin');
}

export async function sair() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/');
}
