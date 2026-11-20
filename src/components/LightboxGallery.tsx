'use client';

import { useState } from 'react';
import { alternarFavorito } from '@/app/cliente/actions';

type Foto = { src: string; alt: string; download?: string; id?: string; favorita?: boolean };

export default function LightboxGallery({ fotos, className = 'masonry', permitirFavoritos = false }: { fotos: Foto[]; className?: string; permitirFavoritos?: boolean }) {
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
      <div className={className}>
        {fotos.map((foto, i) => (
          <div key={foto.id ?? foto.src} style={{ position: 'relative' }}>
            <button type="button" className="lightbox-thumb" onClick={() => setAberta(i)} aria-label={'Ampliar ' + foto.alt}>
              <img src={foto.src} alt={foto.alt} loading="lazy" />
            </button>
            {permitirFavoritos && foto.id && (
              <form action={alternarFavorito} style={{ position: 'absolute', top: 10, right: 10 }}>
                <input type="hidden" name="photo_id" value={foto.id} />
                <button type="submit" aria-label={foto.favorita ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} title={foto.favorita ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} style={{ width: 42, height: 42, borderRadius: 999, border: '1px solid rgba(255,255,255,.5)', background: 'rgba(0,0,0,.72)', color: foto.favorita ? '#ff7b91' : '#fff', fontSize: 23, cursor: 'pointer' }}>
                  {foto.favorita ? '♥' : '♡'}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
      {atual && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Visualização da foto" onClick={() => setAberta(null)}>
          <button type="button" className="lightbox-close" onClick={() => setAberta(null)} aria-label="Fechar">×</button>
          {fotos.length > 1 && <button type="button" className="lightbox-prev" onClick={(e) => { e.stopPropagation(); anterior(); }} aria-label="Foto anterior">‹</button>}
          <img src={atual.src} alt={atual.alt} onClick={(e) => e.stopPropagation()} />
          {fotos.length > 1 && <button type="button" className="lightbox-next" onClick={(e) => { e.stopPropagation(); proxima(); }} aria-label="Próxima foto">›</button>}
          {permitirFavoritos && atual.id && (
            <form action={alternarFavorito} onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 18, left: 18 }}>
              <input type="hidden" name="photo_id" value={atual.id} />
              <button type="submit" className="btn btn-outline">{atual.favorita ? '♥ Remover favorito' : '♡ Adicionar favorito'}</button>
            </form>
          )}
          {atual.download && <a className="lightbox-download" href={atual.download} onClick={(e) => e.stopPropagation()}>Baixar foto</a>}
        </div>
      )}
    </>
  );
}
