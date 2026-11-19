'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowser } from '@/lib/supabase/browser';
import { atualizarPortfolio } from '@/app/admin/actions';

// Envia somente fotos direto do navegador para o Supabase Storage.
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
    return new File([blob], original.name.replace(/\\.[^.]+$/, '') + '.webp', { type: 'image/webp', lastModified: Date.now() });
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
      if (!original.type.startsWith('image/')) {
        erros.push(original.name + ': envie somente imagens.');
        continue;
      }
      setStatus('Preparando ' + (i + 1) + ' de ' + arquivos.length + '…');
      const arquivo = await comprimirImagem(original);

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
          erros.push(`${arquivo.name}: ${erroRegistro.message}`);
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
      <input id={`up-${bucket}`} ref={input} type="file" accept="image/*" multiple />
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
