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
  const deliveryStatus = String(formData.get('delivery_status') ?? 'recebido');
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
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) redirect('/admin');

  const { data: cliente, error: erroConsulta } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();
  if (erroConsulta) throw new Error('Não foi possível consultar o cliente antes da exclusão.');
  if (!cliente) redirect('/admin');

  const admin = createAdminClient();

  // Lista todos os arquivos da pasta antes de removê-los em lotes.
  const caminhos: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data: arquivos, error } = await admin.storage.from('galerias').list(id, { limit: 1000, offset });
    if (error) throw new Error('Não foi possível listar as fotos do cliente. A exclusão foi interrompida.');
    const itens = arquivos ?? [];
    caminhos.push(...itens.filter((a) => a.id && a.name).map((a) => `${id}/${a.name}`));
    if (itens.length < 1000) break;
  }

  for (let i = 0; i < caminhos.length; i += 100) {
    const { error } = await admin.storage.from('galerias').remove(caminhos.slice(i, i + 100));
    if (error) throw new Error('Não foi possível remover todas as fotos. O cadastro foi mantido para evitar perda de referência.');
  }

  // O usuário só é removido depois da confirmação da remoção dos arquivos.
  if (cliente.user_id) {
    const { error } = await admin.auth.admin.deleteUser(cliente.user_id);
    if (error) throw new Error('As fotos foram removidas, mas não foi possível excluir o acesso do cliente.');
  } else {
    const { error } = await admin.from('clients').delete().eq('id', id);
    if (error) throw new Error('Não foi possível excluir o cadastro do cliente.');
  }

  revalidatePath('/admin');
  redirect('/admin');
}

export async function excluirFoto(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const id = String(formData.get('id') ?? '');
  const clienteId = String(formData.get('clienteId') ?? '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clienteId)) return;

  // O caminho é obtido do banco, nunca confiado ao campo oculto do formulário.
  const { data: foto, error: erroConsulta } = await supabase.from('photos')
    .select('path').eq('id', id).eq('client_id', clienteId).maybeSingle();
  if (erroConsulta) throw new Error('Não foi possível localizar a foto.');
  if (!foto?.path || !foto.path.startsWith(clienteId + '/')) return;

  const { error: erroStorage } = await supabase.storage.from('galerias').remove([foto.path]);
  if (erroStorage) throw new Error('Não foi possível remover o arquivo da galeria.');
  const { error } = await supabase.from('photos').delete().eq('id', id).eq('client_id', clienteId);
  if (error) throw new Error('O arquivo foi removido, mas não foi possível atualizar o cadastro da foto.');

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


export async function atualizarStatusEntrega(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('delivery_status') ?? '');
  const validos = ['recebido', 'em_edicao', 'aguardando_aprovacao', 'finalizado', 'entregue'];
  if (!id || !validos.includes(status)) return;
  const { error } = await supabase.from('clients').update({ delivery_status: status }).eq('id', id);
  if (error) throw new Error('Não foi possível atualizar o status da entrega.');
  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath('/admin');
  revalidatePath('/cliente');
}


// FASE 2 — Financeiro manual
export async function atualizarValorContrato(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const clientId = String(formData.get('client_id') ?? '');
  const raw = String(formData.get('contract_value') ?? '').replace(',', '.');
  const value = Number(raw);
  if (!clientId || !Number.isFinite(value) || value < 0 || value > 100000000) return;
  const { error } = await supabase.from('client_contracts').upsert({ client_id: clientId, contract_value: value }, { onConflict: 'client_id' });
  if (error) throw new Error('Não foi possível salvar o valor do contrato.');
  revalidatePath('/admin/financeiro');
  revalidatePath('/admin');
  redirect('/admin/financeiro?resultado=contrato');
}

export async function registrarPagamento(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const clientId = String(formData.get('client_id') ?? '');
  const amount = Number(String(formData.get('amount') ?? '').replace(',', '.'));
  const method = String(formData.get('payment_method') ?? '');
  const paidAt = String(formData.get('paid_at') ?? '');
  const notes = String(formData.get('notes') ?? '').trim().slice(0, 250);
  const methods = ['Pix', 'Dinheiro', 'Cartão', 'Transferência', 'Outro'];
  if (!clientId || !Number.isFinite(amount) || amount <= 0 || amount > 100000000 || !methods.includes(method) || !/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) return;
  const { error } = await supabase.from('finance_payments').insert({
    client_id: clientId, amount, payment_method: method, paid_at: paidAt, notes: notes || null,
  });
  if (error) throw new Error('Não foi possível registrar o pagamento.');
  revalidatePath('/admin/financeiro');
  revalidatePath('/admin');
  redirect('/admin/financeiro?resultado=pagamento');
}

export async function excluirPagamento(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const { error } = await supabase.from('finance_payments').delete().eq('id', id);
  if (error) throw new Error('Não foi possível excluir o pagamento.');
  revalidatePath('/admin/financeiro');
  revalidatePath('/admin');
  redirect('/admin/financeiro?resultado=excluido');
}

// FASE 3 — Agenda de ensaios
export async function criarAgendamento(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const clientId = String(formData.get('client_id') ?? '');
  const title = String(formData.get('title') ?? '').trim().slice(0, 100);
  const startsRaw = String(formData.get('starts_at') ?? '');
  const location = String(formData.get('location') ?? '').trim().slice(0, 250);
  const service = String(formData.get('service') ?? '');
  const notes = String(formData.get('notes') ?? '').trim().slice(0, 1000);
  const validServices = ['Fotografia', 'Filmagem', 'Fotografia e filmagem', 'Reunião'];
  if (!clientId || !title || !location || !validServices.includes(service) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startsRaw)) return;
  const startsAt = new Date(startsRaw + '-03:00');
  if (Number.isNaN(startsAt.getTime())) return;
  const { error } = await supabase.from('appointments').insert({
    client_id: clientId, title, starts_at: startsAt.toISOString(), location, service, notes: notes || null,
  });
  if (error) throw new Error('Não foi possível criar o agendamento.');
  revalidatePath('/admin/agenda');
  revalidatePath('/cliente');
  redirect('/admin/agenda?resultado=criado');
}

export async function atualizarAgendamento(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['agendado', 'concluido', 'cancelado'].includes(status)) return;
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
  if (error) throw new Error('Não foi possível atualizar o agendamento.');
  revalidatePath('/admin/agenda');
  revalidatePath('/cliente');
  redirect('/admin/agenda?resultado=atualizado');
}

export async function excluirAgendamento(formData: FormData) {
  const { supabase } = await exigirAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) throw new Error('Não foi possível excluir o agendamento.');
  revalidatePath('/admin/agenda');
  revalidatePath('/cliente');
  redirect('/admin/agenda?resultado=excluido');
}
