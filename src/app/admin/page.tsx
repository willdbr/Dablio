import Link from 'next/link';
import AdminNav from '@/components/AdminNav';
import CriarClienteForm from '@/components/CriarClienteForm';
import ConfirmButton from '@/components/ConfirmButton';
import { exigirAdmin } from '@/lib/auth';
import { diasRestantes, fmtData, fmtDataHora } from '@/lib/format';
import { excluirMensagem } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Painel | Dáblio', robots: { index: false } };

export default async function Painel() {
  const { supabase } = await exigirAdmin();

  const [{ data: clientes }, { data: mensagens }] = await Promise.all([
    supabase.from('clients').select('id, name, code, expires_at').order('created_at', { ascending: false }),
    supabase.from('messages').select('id, name, email, service, message, created_at').order('created_at', { ascending: false }).limit(50),
  ]);

  return (
    <>
      <AdminNav />
      <main className="page stack">
        <div>
          <h1>Painel</h1>
          <p className="muted" style={{ margin: 0 }}>
            Crie acessos para os clientes, suba as fotos e acompanhe as mensagens do site.
          </p>
        </div>

        <CriarClienteForm />

        <section>
          <h2 className="serif" style={{ fontSize: 32, margin: '0 0 16px' }}>Clientes</h2>
          {(clientes ?? []).length === 0 ? (
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
                  {(clientes ?? []).map((c) => {
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
