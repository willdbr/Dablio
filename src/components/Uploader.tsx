'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowser } from '@/lib/supabase/browser';
import { atualizarPortfolio } from '@/app/admin/actions';

// Envia somente fotos direto do navegador para o Supabase Storage.
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const LIMITE_ORIGINAL = 30 * 1024 * 1024;
const LIMITE_FINAL = 15 * 1024 * 1024;

async function comprimirImagem(original: File): Promise<File> {
  if (!original.type.startsWith('image/') || ['image/gif', 'image/svg+xml'].includes(original.type)) return original;
  try {
    const bitmap = await createImageBitmap(original);
    const escala = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * escala));
    canvas.height = Math.max(1, Math.round(bitmap.height * escala));
    const ctx = canvas.getContext('2d');
    if (!ctx) return original;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (!blob || blob.size >= original.size) return original;
    const baseName = original.name.includes('.') ? original.name.slice(0, original.name.lastIndexOf('.')) : original.name;
    return new File([blob], baseName + '.webp', { type: 'image/webp', lastModified: Date.now() });
  } catch {
    return original;
  }
}

// - Galeria de cliente: bucket "galerias", pasta = id do cliente, registra na tabela photos
// - Portfólio do site: bucket "portfolio", sem pasta e sem registro
export default function Uploader({
  bucket,
  pasta,
  clienteId,
  rotulo,
}: {
  bucket: 'galerias' | 'portfolio';
  pasta?: string;
  clienteId?: string;
  rotulo: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const arquivos = Array.from(input.current?.files ?? []);
    if (bucket === 'galerias' && (!pasta || !clienteId)) {
      setStatus('Não foi possível identificar o cliente desta galeria.');
      return;
    }
    if (arquivos.length === 0) {
      setStatus('Escolha ao menos um arquivo.');
      return;
    }

    setOcupado(true);
    const supabase = createBrowser();
    const erros: string[] = [];
    let enviados = 0;

    for (let i = 0; i < arquivos.length; i++) {
      const original = arquivos[i];
      if (!TIPOS_PERMITIDOS.includes(original.type)) {
        erros.push(original.name + ': formato não permitido. Use JPG, PNG ou WebP.');
        continue;
      }
      if (original.size > LIMITE_ORIGINAL) {
        erros.push(original.name + ': arquivo original acima de 30 MB.');
        continue;
      }
      setStatus('Preparando ' + (i + 1) + ' de ' + arquivos.length + '…');
      const arquivo = await comprimirImagem(original);
      if (!TIPOS_PERMITIDOS.includes(arquivo.type) || arquivo.size > LIMITE_FINAL) {
        erros.push(original.name + ': após a preparação, o arquivo precisa ser JPG, PNG ou WebP e ter no máximo 15 MB.');
        continue;
      }

      const nomeSeguro = arquivo.name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const caminho = `${pasta ? pasta + '/' : ''}${Date.now()}-${i}-${nomeSeguro}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(caminho, arquivo, { contentType: arquivo.type || undefined, upsert: false });
      if (error) {
        erros.push(`${arquivo.name}: ${error.message}`);
        continue;
      }

      if (clienteId) {
        const { error: erroRegistro } = await supabase
          .from('photos')
          .insert({ client_id: clienteId, path: caminho });
        if (erroRegistro) {
          await supabase.storage.from(bucket).remove([caminho]);
          erros.push(`${arquivo.name}: não foi possível registrar a foto na galeria (${erroRegistro.message}). O arquivo enviado foi removido.`);
          continue;
        }
      }
      enviados++;
    }

    if (bucket === 'portfolio' && enviados > 0) {
      try {
        await atualizarPortfolio();
      } catch {
        erros.push('As fotos foram enviadas, mas não foi possível atualizar o cache do site.');
      }
    }

    if (input.current) input.current.value = '';
    setOcupado(false);
    setStatus(
      erros.length === 0
        ? `${enviados} arquivo(s) enviado(s).`
        : `${enviados} enviado(s). Falhas: ${erros.join(' | ')}`
    );
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="upload">
      <label htmlFor={`up-${bucket}`}>{rotulo}</label>
      <input id={`up-${bucket}`} ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple />
      <button type="submit" className="btn" disabled={ocupado}>
        {ocupado ? 'Enviando…' : 'Enviar'}
      </button>
      {status && (
        <p role="status" className="muted" style={{ margin: 0 }}>
          {status}
        </p>
      )}
    </form>
  );
}
