'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { emailDoCliente, normalizarCodigo } from '@/lib/auth';

export type LoginState = { error?: string } | undefined;

export async function loginCliente(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const codigo = normalizarCodigo(String(formData.get('codigo') ?? ''));
  const senha = String(formData.get('senha') ?? '');
  if (!/^[a-z0-9]{6}$/.test(codigo) || !senha || senha.length > 128) return { error: 'Informe um código válido e a senha.' };

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
  if (!email || email.length > 254 || !senha || senha.length > 128) return { error: 'Informe e-mail e senha válidos.' };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error || !data.user) return { error: 'E-mail ou senha incorretos.' };

  // Confirma a sessão e verifica se a conta tem acesso ao painel.
  const { data: sessao, error: erroSessao } = await supabase.auth.getUser();
  if (erroSessao || !sessao.user || sessao.user.id !== data.user.id) {
    console.error('Não foi possível confirmar a sessão do administrador:', erroSessao);
    await supabase.auth.signOut();
    return { error: 'Não foi possível concluir o login. Tente novamente.' };
  }

  const { data: admin, error: erroAdmin } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', sessao.user.id)
    .maybeSingle();

  if (erroAdmin) {
    console.error('Erro ao verificar acesso de administrador:', erroAdmin);
    await supabase.auth.signOut();
    return { error: 'Não foi possível verificar o acesso ao painel. Tente novamente.' };
  }

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
