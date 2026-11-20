'use server';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
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

  const cabecalhos = headers();
  const encaminhado = cabecalhos.get('x-forwarded-for');
  const ip = (cabecalhos.get('x-real-ip') ?? (encaminhado ? encaminhado.split(',').at(-1)?.trim() : null) ?? 'unknown').slice(0, 100);
  const ipHash = createHash('sha256').update(ip).digest('hex');
  const admin = createAdminClient();
  const { data: permitido, error: erroLimite } = await admin.rpc('allow_contact_submission', { p_ip_hash: ipHash });
  if (erroLimite) {
    console.error('Falha no controle de frequência do formulário:', erroLimite);
    return { error: 'Não foi possível enviar agora. Tente novamente em instantes.' };
  }
  if (!permitido) return { error: 'Muitas tentativas. Aguarde 15 minutos ou fale pelo WhatsApp.' };

  const { error } = await admin
    .from('messages')
    .insert({ name: nome, email, service: servico || null, message: mensagem });
  if (error) return { error: 'Não foi possível enviar agora. Tente pelo WhatsApp.' };

  const apiKey = process.env.RESEND_API_KEY;
  const destinatario = process.env.CONTACT_EMAIL;
  const remetente = process.env.RESEND_FROM_EMAIL;
  if (apiKey && destinatario && remetente) {
    const escapar = (valor: string) => valor.replace(/[&<>"']/g, (caractere) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[caractere] ?? caractere);
    try {
      const resposta = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: remetente,
          to: [destinatario],
          reply_to: email,
          subject: 'Nova mensagem pelo site Dáblio',
          html: '<h2>Nova mensagem recebida</h2><p><b>Nome:</b> ' + escapar(nome) +
            '</p><p><b>E-mail:</b> ' + escapar(email) + '</p><p><b>Serviço:</b> ' +
            escapar(servico || 'Não informado') + '</p><p><b>Mensagem:</b><br>' +
            escapar(mensagem).replace(/\n/g, '<br>') + '</p>',
        }),
      });
      if (!resposta.ok) console.error('Resend não enviou a notificação:', await resposta.text());
    } catch (erroEmail) {
      console.error('Falha ao enviar notificação por e-mail:', erroEmail);
    }
  }

  return { ok: true };
}
