'use client';

import { useState } from 'react';

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function juntar(partes: BlobPart[]) {
  return new Blob(partes, { type: 'application/zip' });
}

export default function DownloadAllButton({ urls }: { urls: string[] }) {
  const [ocupado, setOcupado] = useState(false);
  const [status, setStatus] = useState('');

  async function baixarTudo() {
    if (!urls.length || ocupado) return;
    setOcupado(true);
    setStatus('Preparando arquivo ZIP…');
    try {
      const locais: { nome: string; bytes: Uint8Array; crc: number; offset: number }[] = [];
      const centrais: Uint8Array[] = [];
      const encoder = new TextEncoder();
      let offset = 0;

      for (let i = 0; i < urls.length; i++) {
        setStatus('Baixando foto ' + (i + 1) + ' de ' + urls.length + '…');
        const response = await fetch(urls[i]);
        if (!response.ok) throw new Error('Não foi possível baixar a foto ' + (i + 1));
        const bytes = new Uint8Array(await response.arrayBuffer());
        const tipo = response.headers.get('content-type') || '';
        const ext = tipo.includes('png') ? 'png' : tipo.includes('webp') ? 'webp' : tipo.includes('gif') ? 'gif' : 'jpg';
        const nome = 'foto-' + String(i + 1).padStart(3, '0') + '.' + ext;
        const nomeBytes = encoder.encode(nome);
        const crc = crc32(bytes);
        const local = new Uint8Array(30 + nomeBytes.length);
        const lv = new DataView(local.buffer);
        lv.setUint32(0, 0x04034b50, true);
        lv.setUint16(4, 20, true);
        lv.setUint16(6, 0x0800, true);
        lv.setUint16(8, 0, true);
        lv.setUint32(14, crc, true);
        lv.setUint32(18, bytes.length, true);
        lv.setUint32(22, bytes.length, true);
        lv.setUint16(26, nomeBytes.length, true);
        local.set(nomeBytes, 30);
        locais.push({ nome, bytes, crc, offset });
        offset += local.length + bytes.length;
        centrais.push(local);
      }

      const centralBytes: Uint8Array[] = [];
      let centralSize = 0;
      for (let i = 0; i < locais.length; i++) {
        const item = locais[i];
        const nomeBytes = encoder.encode(item.nome);
        const header = new Uint8Array(46 + nomeBytes.length);
        const v = new DataView(header.buffer);
        v.setUint32(0, 0x02014b50, true);
        v.setUint16(4, 20, true);
        v.setUint16(6, 20, true);
        v.setUint16(8, 0x0800, true);
        v.setUint16(10, 0, true);
        v.setUint32(16, item.crc, true);
        v.setUint32(20, item.bytes.length, true);
        v.setUint32(24, item.bytes.length, true);
        v.setUint16(28, nomeBytes.length, true);
        v.setUint32(42, item.offset, true);
        header.set(nomeBytes, 46);
        centralBytes.push(header);
        centralSize += header.length;
      }

      const fim = new Uint8Array(22);
      const ev = new DataView(fim.buffer);
      ev.setUint32(0, 0x06054b50, true);
      ev.setUint16(8, locais.length, true);
      ev.setUint16(10, locais.length, true);
      ev.setUint32(12, centralSize, true);
      ev.setUint32(16, offset, true);

      const partes: BlobPart[] = [];
      for (let i = 0; i < locais.length; i++) {
        partes.push(centrais[i], locais[i].bytes);
      }
      partes.push(...centralBytes, fim);
      const arquivo = juntar(partes);
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'galeria-dablio.zip';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setStatus('Download da galeria iniciado.');
    } catch (erro) {
      setStatus(erro instanceof Error ? erro.message : 'Falha ao preparar o ZIP.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-outline" onClick={baixarTudo} disabled={ocupado || urls.length === 0}>
        {ocupado ? 'Preparando ZIP…' : 'Baixar todas as fotos (.zip)'}
      </button>
      {status && <p className="muted" role="status" style={{ margin: 0 }}>{status}</p>}
    </>
  );
}
