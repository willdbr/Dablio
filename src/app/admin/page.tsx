import Link from 'next/link';
import AdminNav from '@/components/AdminNav';
import CriarClienteForm from '@/components/CriarClienteForm';
import ConfirmButton from '@/components/ConfirmButton';
import { exigirAdmin } from '@/lib/auth';
import { diasRestantes, fmtData, fmtDataHora } from '@/lib/format';
import { excluirMensagem } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Painel | Dáblio', robots: { index: false } };

const cardStyle = {
  padding: '20px 22px',
  background: 'var(--bg-soft)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  minWidth: 0,
};

export default async function Painel() {
  const { supabase } = await exigirAdmin();

  const [
    { data: clientes },
    { data: mensagens },
    { count: totalClientes },
    { count: totalFotos },
    { count: totalMensagens },
    { count: depoimentosPendentes },
  ] = await Promise.all([
    supabase.from('clients').select('id, name, code, expires_at').order('created_at', { ascending: false }),
    supabase.from('messages').select('id, name, email, service, message, created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('photos').select('*', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase.from('testimonials').select('*', { count: 'exact', head: true }).eq('visible', false),
  ]);

  const listaClientes = clientes ?? [];
  const ativos = listaClientes.filter((c) => diasRestantes(c.expires_at) > 0).length;
  const expirando = listaClientes.filter((c) => {
    const dias = diasRestantes(c.expires_at);
    return dias > 0 && dias <= 7;
  });

  return (
    <>
      <AdminNav />
      <main className="page stack">
        <div>
          <h1>Painel</h1>
          <p className="muted" style={{ margin: 0 }}>
            Visão geral da operação, clientes, galerias e contatos da Dáblio.
          </p>
        </div>

        <section className="admin-shortcuts">
          <Link href="/admin/financeiro" className="admin-shortcut"><strong>Financeiro</strong><span className="muted">Contratos, pagamentos e saldos →</span></Link>
          <Link href="/admin/agenda" className="admin-shortcut"><strong>Agenda de ensaios</strong><span className="muted">Datas, horários e locais →</span></Link>
          <Link href="/admin/notificacoes" className="admin-shortcut"><strong>Notificações</strong><span className="muted">Contatos, depoimentos e entregas →</span></Link>
        </section>

        <section className="stack" style={{ gap: 16 }}>
          <h2 className="serif" style={{ fontSize: 30, margin: 0 }}>Visão geral</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
            <div style={cardStyle}>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>Clientes cadastrados</p>
              <strong style={{ display: 'block', fontSize: 32 }}>{totalClientes ?? listaClientes.length}</strong>
              <span className="muted" style={{ fontSize: 13 }}>{ativos} com acesso ativo</span>
            </div>
            <div style={cardStyle}>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>Fotos nas galerias</p>
              <strong style={{ display: 'block', fontSize: 32 }}>{totalFotos ?? 0}</strong>
              <span className="muted" style={{ fontSize: 13 }}>Arquivos cadastrados</span>
            </div>
            <div style={cardStyle}>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>Mensagens recebidas</p>
              <strong style={{ display: 'block', fontSize: 32 }}>{totalMensagens ?? mensagens?.length ?? 0}</strong>
              <span className="muted" style={{ fontSize: 13 }}>Solicitações pelo site</span>
            </div>
            <div style={cardStyle}>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>Depoimentos pendentes</p>
              <strong style={{ display: 'block', fontSize: 32 }}>{depoimentosPendentes ?? 0}</strong>
              <Link href="/admin/conteudo" style={{ color: 'var(--accent)', fontSize: 13 }}>Revisar depoimentos</Link>
            </div>
          </div>
        </section>

        <section className="form" style={{ padding: 20, border: '1px solid var(--line)', borderRadius: 8 }}>
          <h2 className="serif" style={{ fontSize: 28, margin: 0 }}>Atenção necessária</h2>
          {expirando.length === 0 && (depoimentosPendentes ?? 0) === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Nenhum alerta no momento.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 22 }}>
              {expirando.length > 0 && (
                <li>{expirando.length} cliente(s) com acesso expirando nos próximos 7 dias.</li>
              )}
              {(depoimentosPendentes ?? 0) > 0 && (
                <li>{depoimentosPendentes} depoimento(s) aguardando aprovação. <Link href="/admin/conteudo" style={{ color: 'var(--accent)' }}>Revisar</Link>.</li>
              )}
            </ul>
          )}
          {expirando.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Cliente</th><th>Expira em</th><th>Prazo</th><th></th></tr></thead>
                <tbody>
                  {expirando.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{fmtData(c.expires_at)}</td>
                      <td><span className="badge badge-off">{diasRestantes(c.expires_at)} dia(s)</span></td>
                      <td><Link href={`/admin/clientes/${c.id}`} className="btn btn-outline btn-small">Abrir</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <CriarClienteForm />

        <section>
          <h2 className="serif" style={{ fontSize: 32, margin: '0 0 16px' }}>Clientes</h2>
          {listaClientes.length === 0 ? (
            <p className="muted">Nenhum cliente ainda.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Código</th>
                    <th>Validade</th>
                    <th>Situação</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {listaClientes.map((c) => {
                    const dias = diasRestantes(c.expires_at);
                    const ativo = dias > 0;
                    return (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{String(c.code).toUpperCase()}</td>
                        <td>{fmtData(c.expires_at)}</td>
                        <td>
                          <span className={`badge ${ativo ? 'badge-ok' : 'badge-off'}`}>
                            {ativo ? `Ativo · ${dias} dia(s)` : 'Expirado'}
                          </span>
                        </td>
                        <td>
                          <Link href={`/admin/clientes/${c.id}`} className="btn btn-outline btn-small">
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="serif" style={{ fontSize: 32, margin: '0 0 16px' }}>Mensagens do site</h2>
          {(mensagens ?? []).length === 0 ? (
            <p className="muted">Nenhuma mensagem ainda.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Contato</th>
                    <th>Serviço</th>
                    <th>Mensagem</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(mensagens ?? []).map((m) => (
                    <tr key={m.id}>
                      <td>{fmtDataHora(m.created_at)}</td>
                      <td>
                        {m.name}
                        <br />
                        <a href={`mailto:${m.email}`} style={{ color: 'var(--accent)' }}>
                          {m.email}
                        </a>
                      </td>
                      <td>{m.service ?? '-'}</td>
                      <td style={{ whiteSpace: 'pre-wrap' }}>{m.message}</td>
                      <td>
                        <form action={excluirMensagem}>
                          <input type="hidden" name="id" value={m.id} />
                          <ConfirmButton mensagem="Excluir esta mensagem?" className="btn btn-danger">
                            Excluir
                          </ConfirmButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
