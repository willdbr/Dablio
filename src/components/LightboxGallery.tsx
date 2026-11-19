'use client';

import { useState } from 'react';

type Foto = { src: string; alt: string; download?: string };

export default function LightboxGallery({ fotos }: { fotos: Foto[] }) {
  const [aberta, setAberta] = useState<number | null>(null);
  const atual = aberta === null ? null : fotos[aberta];

  function anterior() {
    setAberta((i) => i === null ? null : (i - 1 + fotos.length) % fotos.length);
  }
  function proxima() {
    setAberta((i) => i === null ? null : (i + 1) % fotos.length);
  }

  return (
    <>
      <div className="masonry">
        {fotos.map((foto, i) => (
          <button key={foto.src} type="button" className="lightbox-thumb" onClick={() => setAberta(i)} aria-label={'Ampliar ' + foto.alt}>
            <img src={foto.src} alt={foto.alt} loading="lazy" />
          </button>
        ))}
      </div>
      {atual && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Visualização da foto" onClick={() => setAberta(null)}>
          <button type="button" className="lightbox-close" onClick={() => setAberta(null)} aria-label="Fechar">×</button>
          {fotos.length > 1 && <button type="button" className="lightbox-prev" onClick={(e) => { e.stopPropagation(); anterior(); }} aria-label="Foto anterior">‹</button>}
          <img src={atual.src} alt={atual.alt} onClick={(e) => e.stopPropagation()} />
          {fotos.length > 1 && <button type="button" className="lightbox-next" onClick={(e) => { e.stopPropagation(); proxima(); }} aria-label="Próxima foto">›</button>}
          {atual.download && <a className="lightbox-download" href={atual.download} onClick={(e) => e.stopPropagation()}>Baixar foto</a>}
        </div>
      )}
    </>
  );
}
