'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowser } from '@/lib/supabase/browser';

// Envia fotos direto do navegador para o Supabase Storage.
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
      const arquivo = arquivos[i];
      setStatus(`Enviando ${i + 1} de ${arquivos.length}…`);

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
      <input id={`up-${bucket}`} ref={input} type="file" accept="image/*,video/mp4" multiple />
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
