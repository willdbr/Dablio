import { redirect } from 'next/navigation';
import Logo from '@/components/Logo';
import LightboxGallery from '@/components/LightboxGallery';
import DownloadAllButton from '@/components/DownloadAllButton';
import { createClient } from '@/lib/supabase/server';
import { sair } from '@/app/auth-actions';
import { diasRestantes, fmtData } from '@/lib/format';
import { WHATSAPP_URL } from '@/lib/config';
import { enviarDepoimento } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minhas fotos | Dáblio', robots: { index: false, follow: false } };

export default async function AreaCliente({ searchParams }: { searchParams?: { depoimento?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/cliente/login');

  const { data: cliente } = await supabase
    .from('clients')
    .select('id, name, expires_at, service, video_url, delivery_status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!cliente) redirect('/cliente/login');

  const expirado = new Date(cliente.expires_at) <= new Date();
  const diasAteExpirar = diasRestantes(cliente.expires_at);
  const incluiVideo = ['Filmagem', 'Fotografia e filmagem'].includes(cliente.service ?? '') && Boolean(cliente.video_url);
  const { data: depoimento } = await supabase.from('testimonials')
    .select('id, visible').eq('client_id', cliente.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();

  let fotos: { id: string; ver: string; baixar: string; favorita: boolean }[] = [];
  let houveErroCarregamento = false;

  if (!expirado) {
    // As regras do banco já filtram: só vêm as fotos deste cliente.
    const { data: linhas, error: erroConsulta } = await supabase
      .from('photos')
      .select('id, path')
      .order('created_at', { ascending: true });

    if (erroConsulta) {
      console.error('Erro ao consultar fotos do cliente:', erroConsulta);
      houveErroCarregamento = true;
    } else {
      const caminhos = (linhas ?? []).map((l) => l.path as string);

      if (caminhos.length > 0) {
        const [ver, baixar] = await Promise.all([
          supabase.storage.from('galerias').createSignedUrls(caminhos, 3600),
          supabase.storage.from('galerias').createSignedUrls(caminhos, 3600, { download: true }),
        ]);

        if (ver.error) console.error('Erro ao gerar URLs de visualização:', ver.error);
        if (baixar.error) console.error('Erro ao gerar URLs de download:', baixar.error);

        fotos = (linhas ?? []).map((l, i) => {
          const erroIndividual = ver.data?.[i]?.error;
          if (erroIndividual) console.error(`Erro ao gerar URL da foto ${i + 1}:`, erroIndividual);
          return {
            id: l.id as string,
            ver: ver.data?.[i]?.signedUrl ?? '',
            baixar: baixar.data?.[i]?.signedUrl ?? '',\n            favorita: favoritosSet.has(l.id),
          };
        });

        if (fotos.some((foto) => !foto.ver)) houveErroCarregamento = true;
      }
    }
  }

  return (
    <>
      <header className="topbar">
        <Logo />
        <form action={sair}>
          <button type="submit" className="btn btn-outline btn-small">
            Sair
          </button>
        </form>
      </header>
      <main className="page stack">
        <div>
          <div className="eyebrow">Área do cliente</div>
          <h1>Olá, {cliente.name}</h1>
          {expirado ? (
            <p className="muted">O seu acesso expirou em {fmtData(cliente.expires_at)}.</p>
          ) : (
            <p className="muted">
              Seu acesso vai até {fmtData(cliente.expires_at)} ({diasRestantes(cliente.expires_at)} dias
              restantes). Baixe suas fotos antes dessa data.
            </p>
          )}
        </div>

        {!expirado && diasAteExpirar > 0 && diasAteExpirar <= 7 && (
          <p className="error" role="status">
            Atenção: seu acesso expira em {diasAteExpirar} dia(s), no dia {fmtData(cliente.expires_at)}.
            Baixe suas fotos antes do vencimento.
          </p>
        )}


        {!expirado && (
          <section className="form" style={{ padding: 20, border: '1px solid var(--line)', borderRadius: 8 }}>
            <h2 className="serif" style={{ fontSize: 28, margin: 0 }}>Acompanhamento do seu trabalho</h2>
            <p className="muted" style={{ margin: 0 }}>Você pode acompanhar o andamento do seu ensaio por aqui.</p>
            <strong style={{ color: 'var(--accent)' }}>{({ recebido: 'Ensaio recebido', em_edicao: 'Em edição', aguardando_aprovacao: 'Aguardando sua aprovação', finalizado: 'Finalizado', entregue: 'Entregue' } as Record<string, string>)[cliente.delivery_status ?? 'recebido'] ?? 'Ensaio recebido'}</strong>
          </section>
        )}

        {incluiVideo && !expirado && (
          <section className="form">
            <h2 className="serif" style={{ fontSize: 32, margin: 0 }}>Seu vídeo</h2>
            <p className="muted" style={{ margin: 0 }}>Seu vídeo está hospedado em uma plataforma externa.</p>
            <a className="btn" href={cliente.video_url!} target="_blank" rel="noopener noreferrer">
              Assistir ao vídeo
            </a>
          </section>
        )}

        {searchParams?.depoimento === 'enviado' && (
          <p className="credenciais" role="status">Depoimento enviado. Obrigado! Ele ficará aguardando sua aprovação antes de aparecer no site.</p>
        )}
        {searchParams?.depoimento === 'autorizacao' && (
          <p className="error" role="alert">Para enviar o depoimento, é necessário marcar a autorização de publicação.</p>
        )}
        {searchParams?.depoimento === 'erro' && (
          <p className="error" role="alert">Não foi possível enviar seu depoimento agora. Tente novamente mais tarde.</p>
        )}
        {houveErroCarregamento && (
          <p role="alert" className="muted">
            Não foi possível carregar algumas fotos agora. Tente atualizar a página ou entre em contato pelo WhatsApp.
          </p>
        )}

        {!expirado && (
          <section className="form">
            <h2 className="serif" style={{ fontSize: 30, margin: 0 }}>Deixe seu depoimento</h2>
            {depoimento ? (
              <p className="muted" style={{ margin: 0 }}>
                {depoimento.visible
                  ? 'Seu depoimento já foi publicado no site. Obrigado por compartilhar sua experiência!'
                  : 'Recebemos seu depoimento. Ele está aguardando aprovação e não será publicado antes disso.'}
              </p>
            ) : (
              <>
                <p className="muted" style={{ margin: 0 }}>
                  Conte como foi sua experiência com a Dáblio. Seu texto só será exibido publicamente depois de aprovado no painel.
                </p>
                <form action={enviarDepoimento} className="form">
                  <div className="field">
                    <label htmlFor="testimonial_quote">Seu depoimento</label>
                    <textarea id="testimonial_quote" name="quote" required rows={4} maxLength={1000} placeholder="Escreva aqui como foi sua experiência..." />
                  </div>
                  <label className="inline-check">
                    <input type="checkbox" name="consent" required />
                    Autorizo a publicação deste depoimento no site da Dáblio, após aprovação.
                  </label>
                  <button type="submit" className="btn">Enviar depoimento</button>
                </form>
              </>
            )}
          </section>
        )}

        {expirado ? (
          <div>
            <a href={WHATSAPP_URL} className="btn">
              Pedir novo acesso pelo WhatsApp
            </a>
          </div>
        ) : fotos.length === 0 ? (
          <p className="muted">Suas fotos ainda estão sendo preparadas. Volte em breve.</p>
        ) : (
          <div className="stack" style={{ gap: 16 }}>
            <DownloadAllButton urls={fotos.map((f) => f.baixar).filter(Boolean)} />
            <LightboxGallery permitirFavoritos fotos={fotos.filter((f) => f.ver).map((f, i) => ({ id: f.id, src: f.ver, alt: `Foto ${i + 1}`, download: f.baixar, favorita: f.favorita }))} />
          </div>
        )}
      </main>
    </>
  );
}
