'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function enviarDepoimento(formData: FormData) {
  const quote = String(formData.get('quote') ?? '').trim().slice(0, 1000);
  const consent = formData.get('consent') === 'on';
  if (!quote || !consent) redirect('/cliente?depoimento=autorizacao');

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/cliente/login');

  const { data: cliente } = await supabase.from('clients')
    .select('id, name, expires_at').eq('user_id', user.id).maybeSingle();
  if (!cliente || new Date(cliente.expires_at) <= new Date()) redirect('/cliente');

  const { data: existente } = await supabase.from('testimonials')
    .select('id').eq('client_id', cliente.id).limit(1).maybeSingle();
  if (existente) redirect('/cliente');

  const { error } = await supabase.from('testimonials').insert({
    client_id: cliente.id,
    client_name: cliente.name,
    quote,
    consent: true,
    consented_at: new Date().toISOString(),
    visible: false,
  });
  if (error) {
    console.error('Erro ao salvar depoimento do cliente:', error);
    redirect('/cliente?depoimento=erro');
  }

  revalidatePath('/cliente');
  revalidatePath('/admin/conteudo');
  redirect('/cliente?depoimento=enviado');
}
