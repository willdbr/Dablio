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


export async function alternarFavorito(formData: FormData) {
  const photoId = String(formData.get('photo_id') ?? '');
  if (!photoId) return;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/cliente/login');

  const { data: cliente } = await supabase.from('clients')
    .select('id, expires_at').eq('user_id', user.id).maybeSingle();
  if (!cliente || new Date(cliente.expires_at) <= new Date()) redirect('/cliente');

  const { data: foto } = await supabase.from('photos')
    .select('id').eq('id', photoId).maybeSingle();
  if (!foto) redirect('/cliente');

  const { data: existente } = await supabase.from('photo_favorites')
    .select('photo_id').eq('photo_id', photoId).eq('client_id', cliente.id).maybeSingle();

  if (existente) {
    const { error } = await supabase.from('photo_favorites')
      .delete().eq('photo_id', photoId).eq('client_id', cliente.id);
    if (error) throw new Error('Não foi possível remover a foto dos favoritos.');
  } else {
    const { error } = await supabase.from('photo_favorites').insert({
      photo_id: photoId, client_id: cliente.id, user_id: user.id,
    });
    if (error) throw new Error('Não foi possível adicionar a foto aos favoritos.');
  }
  revalidatePath('/cliente');
  revalidatePath(`/admin/clientes/${cliente.id}`);
}
