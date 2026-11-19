import AdminNav from '@/components/AdminNav';
import DemoVideoUploader from '@/components/DemoVideoUploader';
import ConfirmButton from '@/components/ConfirmButton';
import { exigirAdmin } from '@/lib/auth';
import { excluirVideoDemo } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Vídeo demonstrativo | Painel', robots: { index: false } };

export default async function PainelVideoDemo() {
  const { supabase } = await exigirAdmin();
  const { data } = await supabase.storage.from('site-demo').list('', { limit: 10 });
  const existe = (data ?? []).some((arquivo) => arquivo.name === 'demo.mp4');

  return (
    <>
      <AdminNav />
      <main className="page stack">
        <div>
          <h1>Vídeo demonstrativo</h1>
          <p className="muted" style={{ margin: 0 }}>
            Este vídeo aparece na página inicial em loop, sem áudio automático. Enviar outro arquivo substitui o atual.
          </p>
        </div>
        <DemoVideoUploader />
        {existe ? (
          <section className="form">
            <p>Há um vídeo demonstrativo publicado.</p>
            <form action={excluirVideoDemo}>
              <ConfirmButton mensagem="Remover o vídeo demonstrativo do site?" className="btn btn-danger">
                Remover vídeo
              </ConfirmButton>
            </form>
          </section>
        ) : (
          <p className="muted">Nenhum vídeo demonstrativo enviado ainda.</p>
        )}
      </main>
    </>
  );
}
