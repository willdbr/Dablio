'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin, emailDoCliente, gerarCodigo, gerarSenha } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { DIAS_PADRAO } from '@/lib/config';

function lerDias(valor: FormDataEntryValue | null) {
  const n = parseInt(String(valor ?? ''), 10);
  if (!Number.isFinite(n)) return DIAS_PADRAO;
  return Math.min(Math.max(n, 1), 730);
}

const emDias = (dias: number) => new Date(Date.now() + dias * 86400000);

export type NovoClienteState =
  | { error?: string; ok?: boolean; nome?: string; codigo?: string; senha?: string; expiraEm?: string }
  | undefined;

export async function criarCliente(
  _prev: NovoClienteState,
  formData: FormData
): Promise<NovoClienteState> {
  const { supabase } = await exigirAdmin();

  const nome = String(formData.get('nome') ?? '').trim();
  const dias = lerDias(formData.get('dias'));
  const service = String(formData.get('service') ?? 'Fotografia');
  if (!['Fotografia', 'Filmagem', 'Fotografia e filmagem'].includes(service)) return { error: 'Selecione um serviço válido.' };
  if (!nome) return { error: 'Informe o nome do cliente.' };

  const admin = createAdminClient();
  const codigo = gerarCodigo();
  const senha = gerarSenha();

  const { data: criado, error } = await admin.auth.admin.createUser({
    email: emailDoCliente(codigo),
    password: senha,
    email_confirm: true,
  });
  if (error || !criado.user) {
    return { error: `Não foi possível criar o acesso. ${error?.message ?? ''}`.trim() };
  }

  const expira = emDias(dias);
  const { error: erroCliente } = await supabase.from('clients').insert({
    user_id: criado.user.id,
    code: codigo,
    name: nome,
    service,
    expires_at: expira.toISOString(),
  });
  if (erroCliente) {
    await admin.auth.admin.deleteUser(criado.user.id);
    return { error: `Erro ao salvar o cliente: ${erroCliente.message}` };
  }

  revalidatePath('/admin');
  return { ok: true, nome, codigo: codigo.toUpperCase(), senha, expiraEm: expira.toISOString() };
}

export async function renovarAcesso(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const id = String(formData.get('id') ?? '');
  const dias = lerDias(formData.get('dias'));

  await supabase.from('clients').update({ expires_at: emDias(dias).toISOString() }).eq('id', id);

  revalidatePath('/admin');
  revalidatePath(`/admin/clientes/${id}`);
}

export type NovaSenhaState = { error?: string; ok?: boolean; senha?: string } | undefined;

export async function redefinirSenha(
  _prev: NovaSenhaState,
  formData: FormData
): Promise<NovaSenhaState> {
  const { supabase } = await exigirAdmin();
  const id = String(formData.get('id') ?? '');

  const { data: cliente } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();
  if (!cliente?.user_id) return { error: 'Cliente não encontrado.' };

  const senha = gerarSenha();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(cliente.user_id, { password: senha });
  if (error) return { error: 'Não foi possível redefinir a senha.' };

  return { ok: true, senha };
}

export async function excluirCliente(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const id = String(formData.get('id') ?? '');

  const { data: cliente } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();
  if (!cliente) redirect('/admin');

  const admin = createAdminClient();

  // Apaga os arquivos da pasta do cliente
  const { data: arquivos } = await admin.storage.from('galerias').list(id, { limit: 1000 });
  if (arquivos && arquivos.length > 0) {
    await admin.storage.from('galerias').remove(arquivos.map((a) => `${id}/${a.name}`));
  }

  // Apagar o usuário remove também o cadastro e as fotos (cascata)
  if (cliente.user_id) {
    await admin.auth.admin.deleteUser(cliente.user_id);
  } else {
    await admin.from('clients').delete().eq('id', id);
  }

  revalidatePath('/admin');
  redirect('/admin');
}

export async function excluirFoto(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const id = String(formData.get('id') ?? '');
  const path = String(formData.get('path') ?? '');
  const clienteId = String(formData.get('clienteId') ?? '');

  await supabase.storage.from('galerias').remove([path]);
  await supabase.from('photos').delete().eq('id', id);

  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function atualizarDadosMidiaCliente(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const id = String(formData.get('id') ?? '');
  const service = String(formData.get('service') ?? '');
  const videoUrl = String(formData.get('video_url') ?? '').trim();
  const servicosValidos = ['Fotografia', 'Filmagem', 'Fotografia e filmagem'];
  if (!id || !servicosValidos.includes(service)) return;
  if (videoUrl) {
    try {
      const url = new URL(videoUrl);
      if (url.protocol !== 'https:') return;
    } catch {
      return;
    }
  }
  const { error } = await supabase.from('clients')
    .update({ service, video_url: videoUrl || null }).eq('id', id);
  if (error) throw new Error('Não foi possível atualizar os dados de vídeo do cliente.');
  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath('/cliente');
  redirect(`/admin/clientes/${id}?midia=salvo`);
}

export async function salvarApresentacao(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const titulo = String(formData.get('about_title') ?? '').trim().slice(0, 100);
  const texto = String(formData.get('about_text') ?? '').trim().slice(0, 3000);
  await supabase.from('site_profile').upsert({ id: 1, about_title: titulo || 'Sobre mim', about_text: texto });
  revalidatePath('/');
  revalidatePath('/admin/conteudo');
}

export async function criarDepoimento(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const nome = String(formData.get('client_name') ?? '').trim().slice(0, 100);
  const quote = String(formData.get('quote') ?? '').trim().slice(0, 1000);
  const visible = formData.get('visible') === 'on';
  const consent = formData.get('consent') === 'on';
  if (!nome || !quote || !consent) return;
  await supabase.from('testimonials').insert({
    client_name: nome, quote, visible, consent: true, consented_at: new Date().toISOString(),
  });
  revalidatePath('/');
  revalidatePath('/admin/conteudo');
}

export async function atualizarStatusDepoimento(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const id = String(formData.get('id') ?? '');
  const visible = formData.get('visible') === 'true';
  if (!id) return;
  const { error } = await supabase.from('testimonials')
    .update({ visible }).eq('id', id).eq('consent', true);
  if (error) throw new Error('Não foi possível atualizar a publicação do depoimento.');
  revalidatePath('/');
  revalidatePath('/admin/conteudo');
}

export async function excluirDepoimento(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const id = String(formData.get('id') ?? '');
  await supabase.from('testimonials').delete().eq('id', id);
  revalidatePath('/');
  revalidatePath('/admin/conteudo');
}

export async function excluirVideoDemo() {
  const { supabase } = await exigirAdmin();
  await supabase.storage.from('site-demo').remove(['demo.mp4']);
  revalidatePath('/');
  revalidatePath('/admin/video-demo');
}

export async function atualizarVideoDemo() {
  await exigirAdmin();
  revalidatePath('/');
  revalidatePath('/admin/video-demo');
}

export async function atualizarPortfolio() {
  await exigirAdmin();
  revalidatePath('/');
  revalidatePath('/admin/portfolio');
}

export async function excluirPortfolio(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const nome = String(formData.get('nome') ?? '');

  await supabase.storage.from('portfolio').remove([nome]);

  revalidatePath('/');
  revalidatePath('/admin/portfolio');
}

export async function excluirMensagem(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const id = String(formData.get('id') ?? '');

  await supabase.from('messages').delete().eq('id', id);

  revalidatePath('/admin');
}
