import AdminNav from '@/components/AdminNav';
import ConfirmButton from '@/components/ConfirmButton';
import { exigirAdmin } from '@/lib/auth';
import { atualizarStatusDepoimento, criarDepoimento, excluirDepoimento, salvarApresentacao } from '../actions';
import { fmtDataHora } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Conteúdo do site | Painel', robots: { index: false } };

export default async function PainelConteudo() {
  const { supabase } = await exigirAdmin();
  const [{ data: perfil }, { data: depoimentos }] = await Promise.all([
    supabase.from('site_profile').select('about_title, about_text').eq('id', 1).maybeSingle(),
    supabase.from('testimonials').select('id, client_name, quote, visible, consent, consented_at, created_at').order('created_at', { ascending: false }),
  ]);

  return (
    <>
      <AdminNav />
      <main className="page stack">
        <div>
          <h1>Conteúdo do site</h1>
          <p className="muted" style={{ margin: 0 }}>Edite sua apresentação e cadastre depoimentos reais com autorização dos clientes.</p>
        </div>
        <form action={salvarApresentacao} className="form">
          <h2 className="serif" style={{ fontSize: 30, margin: 0 }}>Sobre mim</h2>
          <div className="field">
            <label htmlFor="about_title">Título</label>
            <input id="about_title" name="about_title" maxLength={100} defaultValue={perfil?.about_title ?? 'Sobre mim'} />
          </div>
          <div className="field">
            <label htmlFor="about_text">Texto de apresentação</label>
            <textarea id="about_text" name="about_text" rows={6} maxLength={3000} defaultValue={perfil?.about_text ?? ''} placeholder="Conte um pouco sobre você e seu trabalho." />
          </div>
          <button className="btn" type="submit">Salvar apresentação</button>
        </form>

        <form action={criarDepoimento} className="form">
          <h2 className="serif" style={{ fontSize: 30, margin: 0 }}>Adicionar depoimento</h2>
          <div className="field">
            <label htmlFor="client_name">Nome que será exibido</label>
            <input id="client_name" name="client_name" required maxLength={100} />
          </div>
          <div className="field">
            <label htmlFor="quote">Depoimento</label>
            <textarea id="quote" name="quote" required rows={4} maxLength={1000} />
          </div>
          <label className="inline-check"><input type="checkbox" name="consent" required /> Confirmo que tenho autorização do cliente para publicar este depoimento.</label>
          <label className="inline-check"><input type="checkbox" name="visible" /> Publicar no site após cadastrar</label>
          <button className="btn" type="submit">Cadastrar depoimento</button>
        </form>

        <section className="stack">
          <h2 className="serif" style={{ fontSize: 30, margin: 0 }}>Depoimentos cadastrados</h2>
          {(depoimentos ?? []).length === 0 ? <p className="muted">Nenhum depoimento cadastrado.</p> : (
            <div className="stack">
              {(depoimentos ?? []).map((d) => (
                <article key={d.id} className="form">
                  <strong>{d.client_name} · {d.visible ? 'Publicado' : 'Aguardando aprovação'}</strong>
                  <p style={{ margin: 0 }}>{d.quote}</p>
                  <p className="muted" style={{ margin: 0 }}>
                    Autorização: {d.consent ? 'registrada' : 'não registrada'}{d.consented_at ? ' · ' + fmtDataHora(d.consented_at) : ''}
                  </p>
                  {d.consent && (
                    <form action={atualizarStatusDepoimento}>
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="visible" value={d.visible ? 'false' : 'true'} />
                      <button type="submit" className="btn btn-outline">
                        {d.visible ? 'Retirar do site' : 'Aprovar e publicar'}
                      </button>
                    </form>
                  )}
                  <form action={excluirDepoimento}>
                    <input type="hidden" name="id" value={d.id} />
                    <ConfirmButton mensagem="Excluir este depoimento?" className="btn btn-danger">Excluir</ConfirmButton>
                  </form>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
