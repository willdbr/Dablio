import AdminNav from '@/components/AdminNav';
import Uploader from '@/components/Uploader';
import ConfirmButton from '@/components/ConfirmButton';
import { exigirAdmin } from '@/lib/auth';
import { excluirPortfolio } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Portfólio | Painel', robots: { index: false } };

export default async function PainelPortfolio() {
  const { supabase } = await exigirAdmin();

  const { data } = await supabase.storage
    .from('portfolio')
    .list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });

  const itens = (data ?? [])
    .filter((f) => f.id && !f.name.startsWith('.'))
    .map((f) => ({
      nome: f.name,
      url: supabase.storage.from('portfolio').getPublicUrl(f.name).data.publicUrl,
    }));

  return (
    <>
      <AdminNav />
      <main className="page stack">
        <div>
          <h1>Portfólio do site</h1>
          <p className="muted" style={{ margin: 0 }}>
            As fotos enviadas aqui aparecem na página inicial. A primeira da lista vira a foto de destaque.
          </p>
        </div>

        <Uploader bucket="portfolio" rotulo="Escolha as fotos do portfólio" />

        {itens.length === 0 ? (
          <p className="muted">Nenhuma foto no portfólio ainda.</p>
        ) : (
          <div className="gallery">
            {itens.map((f) => (
              <figure key={f.nome}>
                <img src={f.url} alt="" loading="lazy" />
                <form action={excluirPortfolio} className="actions">
                  <input type="hidden" name="nome" value={f.nome} />
                  <ConfirmButton mensagem="Remover esta foto do site?" className="btn btn-danger">
                    Remover
                  </ConfirmButton>
                </form>
              </figure>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
