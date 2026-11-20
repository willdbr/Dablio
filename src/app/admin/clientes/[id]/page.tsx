import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminNav from '@/components/AdminNav';
import Uploader from '@/components/Uploader';
import ConfirmButton from '@/components/ConfirmButton';
import RedefinirSenhaForm from '@/components/RedefinirSenhaForm';
import { exigirAdmin } from '@/lib/auth';
import { DIAS_PADRAO } from '@/lib/config';
import { diasRestantes, fmtData } from '@/lib/format';
import { atualizarDadosMidiaCliente, atualizarStatusEntrega, excluirCliente, excluirFoto, renovarAcesso } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cliente | Painel', robots: { index: false } };

export default async function PainelCliente({ params, searchParams }: { params: { id: string }; searchParams?: { midia?: string } }) {
  const { supabase } = await exigirAdmin();

  const { data: cliente } = await supabase
    .from('clients')
    .select('id, name, code, expires_at, service, video_url, delivery_status')
    .eq('id', params.id)
    .maybeSingle();
  if (!cliente) notFound();

  const { data: linhas } = await supabase
    .from('photos')
    .select('id, path')
    .eq('client_id', cliente.id)
    .order('created_at', { ascending: true });

  const caminhos = (linhas ?? []).map((l) => l.path as string);
  const { data: assinadas } =
    caminhos.length > 0
      ? await supabase.storage.from('galerias').createSignedUrls(caminhos, 3600)
      : { data: [] as { signedUrl: string }[] };

  const { data: favoritos } = await supabase.from('photo_favorites').select('photo_id').eq('client_id', cliente.id);
  const favoritosIds = new Set((favoritos ?? []).map((f) => f.photo_id));

  const dias = diasRestantes(cliente.expires_at);
  const ativo = dias > 0;

  return (
    <>
      <AdminNav />
      <main className="page stack">
        <div>
          <Link href="/admin" className="muted">
            ← Voltar ao painel
          </Link>
          <h1 style={{ marginTop: 16 }}>{cliente.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Código: <strong style={{ color: 'var(--text)' }}>{String(cliente.code).toUpperCase()}</strong>
            {' · '}
            Válido até {fmtData(cliente.expires_at)}{' '}
            <span className={`badge ${ativo ? 'badge-ok' : 'badge-off'}`}>
              {ativo ? `${dias} dia(s) restantes` : 'Expirado'}
            </span>
          </p>
        </div>

        <section className="form">
          <h2 className="serif" style={{ fontSize: 28, margin: 0 }}>Serviço e vídeo do cliente</h2>
          <p className="muted" style={{ margin: 0 }}>O link só aparece na área do cliente quando o serviço inclui filmagem.</p>
          {searchParams?.midia === 'salvo' && (
            <p role="status" style={{ margin: 0, padding: "12px 16px", borderRadius: 8, border: "1px solid #86b98d", background: "#edf8ef", color: "#205b2b" }}>
              Dados do serviço e link do vídeo salvos com sucesso!
            </p>
          )}
          <form action={atualizarDadosMidiaCliente} className="form">
            <input type="hidden" name="id" value={cliente.id} />
            <div className="field">
              <label htmlFor="service">Serviço contratado</label>
              <select id="service" name="service" defaultValue={cliente.service ?? 'Fotografia'}>
                <option>Fotografia</option>
                <option>Filmagem</option>
                <option>Fotografia e filmagem</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="video_url">Link externo do vídeo (YouTube, Vimeo, Drive etc.)</label>
              <input id="video_url" name="video_url" type="url" defaultValue={cliente.video_url ?? ''} placeholder="https://..." />
            </div>
            <button type="submit" className="btn">Salvar dados de vídeo</button>
          </form>
        </section>


        <section className="form">
          <h2 className="serif" style={{ fontSize: 28, margin: 0 }}>Acompanhamento da entrega</h2>
          <p className="muted" style={{ margin: 0 }}>O cliente poderá acompanhar esta etapa na área reservada.</p>
          <form action={atualizarStatusEntrega} className="form">
            <input type="hidden" name="id" value={cliente.id} />
            <div className="field">
              <label htmlFor="delivery_status">Etapa atual</label>
              <select id="delivery_status" name="delivery_status" defaultValue={cliente.delivery_status ?? 'recebido'}>
                <option value="recebido">Ensaio recebido</option>
                <option value="em_edicao">Em edição</option>
                <option value="aguardando_aprovacao">Aguardando aprovação</option>
                <option value="finalizado">Finalizado</option>
                <option value="entregue">Entregue</option>
              </select>
            </div>
            <button type="submit" className="btn">Atualizar etapa</button>
          </form>
        </section>

        <section className="split">
          <form action={renovarAcesso} className="form">
            <h2 className="serif" style={{ fontSize: 28, margin: 0 }}>Renovar acesso</h2>
            <input type="hidden" name="id" value={cliente.id} />
            <div className="field">
              <label htmlFor="dias">Novo prazo, a partir de hoje (dias)</label>
              <input id="dias" name="dias" type="number" min={1} max={730} defaultValue={DIAS_PADRAO} />
            </div>
            <div>
              <button type="submit" className="btn">
                Renovar
              </button>
            </div>
          </form>

          <div className="form">
            <h2 className="serif" style={{ fontSize: 28, margin: 0 }}>Senha</h2>
            <p className="muted" style={{ margin: 0 }}>
              A senha atual não pode ser exibida. Gere uma nova e envie ao cliente.
            </p>
            <RedefinirSenhaForm id={cliente.id} />
          </div>
        </section>

        <section className="stack" style={{ gap: 24 }}>
          <h2 className="serif" style={{ fontSize: 32, margin: 0 }}>Fotos do cliente</h2>
          <p className="muted" style={{ margin: 0 }}>Fotos favoritas selecionadas pelo cliente: <strong style={{ color: 'var(--text)' }}>{favoritosIds.size}</strong></p>
          <Uploader
            bucket="galerias"
            pasta={cliente.id}
            clienteId={cliente.id}
            rotulo="Escolha as fotos para este cliente"
          />
          {(linhas ?? []).length === 0 ? (
            <p className="muted">Nenhuma foto enviada ainda.</p>
          ) : (
            <div className="gallery">
              {(linhas ?? []).map((l, i) => (
                <figure key={l.id}>
                  <img src={assinadas?.[i]?.signedUrl ?? ''} alt="" loading="lazy" />
                  <form action={excluirFoto} className="actions">
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="path" value={l.path} />
                    <input type="hidden" name="clienteId" value={cliente.id} />
                    <ConfirmButton mensagem="Excluir esta foto?" className="btn btn-danger">
                      Excluir
                    </ConfirmButton>
                  </form>
                </figure>
              ))}
            </div>
          )}
        </section>

        <section>
          <form action={excluirCliente}>
            <input type="hidden" name="id" value={cliente.id} />
            <ConfirmButton
              mensagem="Excluir este cliente, o acesso e TODAS as fotos dele? Não dá para desfazer."
              className="btn btn-danger"
            >
              Excluir cliente e fotos
            </ConfirmButton>
          </form>
        </section>
      </main>
    </>
  );
}
