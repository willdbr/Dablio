'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowser } from '@/lib/supabase/browser';
import { atualizarVideoDemo } from '@/app/admin/actions';

const LIMITE = 50 * 1024 * 1024;

export default function DemoVideoUploader() {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const arquivo = input.current?.files?.[0];
    if (!arquivo) return setStatus('Escolha um vídeo MP4.');
    if (arquivo.type !== 'video/mp4') return setStatus('Envie um arquivo MP4.');
    if (arquivo.size > LIMITE) return setStatus('O vídeo ultrapassa o limite de 50 MB. Comprima o arquivo antes de enviar.');

    setOcupado(true);
    setStatus('Enviando vídeo…');
    const supabase = createBrowser();
    const { error } = await supabase.storage.from('site-demo').upload('demo.mp4', arquivo, {
      upsert: true,
      contentType: 'video/mp4',
      cacheControl: '60',
    });
    if (error) {
      setStatus(`Falha no envio: ${error.message}`);
      setOcupado(false);
      return;
    }
    await atualizarVideoDemo();
    if (input.current) input.current.value = '';
    setStatus('Vídeo demonstrativo atualizado.');
    setOcupado(false);
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="upload">
      <label htmlFor="demo-video">Arquivo demonstrativo (MP4, até 50 MB)</label>
      <input ref={input} id="demo-video" type="file" accept="video/mp4" />
      <button className="btn" type="submit" disabled={ocupado}>{ocupado ? 'Enviando…' : 'Enviar / substituir vídeo'}</button>
      {status && <p className="muted" role="status">{status}</p>}
    </form>
  );
}
