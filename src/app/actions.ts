'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export type ContatoState = { ok?: boolean; error?: string } | undefined;

export async function enviarMensagem(_prev: ContatoState, formData: FormData): Promise<ContatoState> {
  // Campo escondido: robôs costumam preencher, pessoas não.
  if (String(formData.get('site') ?? '') !== '') return { ok: true };

  const nome = String(formData.get('nome') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const servico = String(formData.get('servico') ?? '').trim();
  const mensagem = String(formData.get('mensagem') ?? '').trim();

  if (!nome || !email || !mensagem) return { error: 'Preencha nome, e-mail e mensagem.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Confira o e-mail informado.' };
  if (nome.length > 120 || email.length > 160 || mensagem.length > 3000) {
    return { error: 'Algum campo está muito longo.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('messages')
    .insert({ name: nome, email, service: servico || null, message: mensagem });
  if (error) return { error: 'Não foi possível enviar agora. Tente pelo WhatsApp.' };

  return { ok: true };
}
