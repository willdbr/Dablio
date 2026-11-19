import { redirect } from 'next/navigation';
import Logo from '@/components/Logo';
import { createClient } from '@/lib/supabase/server';
import { sair } from '@/app/auth-actions';
import { diasRestantes, fmtData } from '@/lib/format';
import { WHATSAPP_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minhas fotos | Dáblio' };

export default async function AreaCliente() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/cliente/login');

  const { data: cliente } = await supabase
    .from('clients')
    .select('id, name, expires_at, service, video_url')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!cliente) redirect('/cliente/login');

  const expirado = new Date(cliente.expires_at) <= new Date();
  const diasAteExpirar = diasRestantes(cliente.expires_at);
  const incluiVideo = ['Filmagem', 'Fotografia e filmagem'].includes(cliente.service ?? '') && Boolean(cliente.video_url);

  let fotos: { id: string; ver: string; baixar: string }[] = [];
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
            baixar: baixar.data?.[i]?.signedUrl ?? '',
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

        {incluiVideo && !expirado && (
          <section className="form">
            <h2 className="serif" style={{ fontSize: 32, margin: 0 }}>Seu vídeo</h2>
            <p className="muted" style={{ margin: 0 }}>Seu vídeo está hospedado em uma plataforma externa.</p>
            <a className="btn" href={cliente.video_url!} target="_blank" rel="noopener noreferrer">
              Assistir ao vídeo
            </a>
          </section>
        )}

        {houveErroCarregamento && (
          <p role="alert" className="muted">
            Não foi possível carregar algumas fotos agora. Tente atualizar a página ou entre em contato pelo WhatsApp.
          </p>
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
          <div className="gallery">
            {fotos.map((f, i) => (
              <figure key={f.id}>
                <a href={f.ver} target="_blank" rel="noopener noreferrer">
                  <img src={f.ver} alt={`Foto ${i + 1}`} loading="lazy" />
                </a>
                <div className="actions">
                  <a href={f.baixar} className="btn btn-outline btn-small">
                    Baixar
                  </a>
                </div>
              </figure>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
