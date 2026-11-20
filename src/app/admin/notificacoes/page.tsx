import Link from 'next/link';
import AdminNav from '@/components/AdminNav';
import { exigirAdmin } from '@/lib/auth';
import { fmtDataHora, fmtData } from '@/lib/format';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notificações | Dáblio', robots: { index: false } };
export default async function Notificacoes() {
 const {supabase}=await exigirAdmin();
 const agora=new Date();
 const limite=new Date(agora.getTime()+7*86400000);
 const [{data:mensagens},{data:depoimentos},{data:clientes},{data:agendamentos}]=await Promise.all([
  supabase.from('messages').select('id,name,email,service,created_at,message').order('created_at',{ascending:false}).limit(12),
  supabase.from('testimonials').select('id,client_name,quote,created_at').eq('visible',false).eq('consent',true).order('created_at',{ascending:false}),
  supabase.from('clients').select('id,name,delivery_status,expires_at').neq('delivery_status','entregue').order('created_at',{ascending:false}),
  supabase.from('appointments').select('id,title,client_id,starts_at,location,status').eq('status','agendado').gte('starts_at',agora.toISOString()).lte('starts_at',limite.toISOString()).order('starts_at'),
 ]);
 const pendentes=clientes??[];
 return <><AdminNav/><main className="page stack"><div><Link href="/admin" className="muted">← Voltar ao painel</Link><h1 style={{marginTop:16}}>Central de notificações</h1><p className="muted" style={{margin:0}}>O que precisa da sua atenção agora.</p></div>
 <section className="summary-grid"><article className="summary-card"><span className="muted">Contatos recentes</span><strong>{mensagens?.length??0}</strong></article><article className="summary-card"><span className="muted">Depoimentos pendentes</span><strong>{depoimentos?.length??0}</strong></article><article className="summary-card"><span className="muted">Entregas em andamento</span><strong>{pendentes.length}</strong></article><article className="summary-card"><span className="muted">Ensaios nos próximos 7 dias</span><strong>{agendamentos?.length??0}</strong></article></section>
 <section className="form"><div className="row" style={{justifyContent:'space-between',alignItems:'center'}}><h2 className="serif" style={{fontSize:28,margin:0}}>Novos contatos</h2><Link href="/admin" className="muted">Abrir mensagens →</Link></div>{(mensagens??[]).length===0?<p className="muted">Nenhum contato recebido.</p>:(mensagens??[]).map(m=><article className="notification-item" key={m.id}><strong>{m.name}</strong><span className="muted">{fmtDataHora(m.created_at)} · {m.service??'Serviço não informado'}</span><a href={`mailto:${m.email}`}>{m.email}</a><p style={{margin:0,whiteSpace:'pre-wrap'}}>{m.message}</p></article>)}</section>
 <section className="form"><div className="row" style={{justifyContent:'space-between',alignItems:'center'}}><h2 className="serif" style={{fontSize:28,margin:0}}>Depoimentos aguardando aprovação</h2><Link href="/admin/conteudo" className="muted">Moderar →</Link></div>{(depoimentos??[]).length===0?<p className="muted">Nenhum depoimento pendente.</p>:(depoimentos??[]).map(d=><article className="notification-item" key={d.id}><strong>{d.client_name}</strong><span className="muted">{fmtDataHora(d.created_at)}</span><p style={{margin:0}}>{d.quote}</p></article>)}</section>
 <section className="form"><div className="row" style={{justifyContent:'space-between',alignItems:'center'}}><h2 className="serif" style={{fontSize:28,margin:0}}>Entregas em andamento</h2><Link href="/admin" className="muted">Ver clientes →</Link></div>{pendentes.length===0?<p className="muted">Nenhuma entrega pendente.</p>:<div className="table-wrap"><table className="table"><thead><tr><th>Cliente</th><th>Etapa</th><th>Validade</th><th></th></tr></thead><tbody>{pendentes.map(c=><tr key={c.id}><td>{c.name}</td><td>{({recebido:'Ensaio recebido',em_edicao:'Em edição',aguardando_aprovacao:'Aguardando aprovação',finalizado:'Finalizado'} as Record<string,string>)[c.delivery_status??'recebido']??c.delivery_status}</td><td>{fmtData(c.expires_at)}</td><td><Link href={`/admin/clientes/${c.id}`} className="btn btn-outline btn-small">Abrir</Link></td></tr>)}</tbody></table></div>}</section>
 <section className="form"><div className="row" style={{justifyContent:'space-between',alignItems:'center'}}><h2 className="serif" style={{fontSize:28,margin:0}}>Ensaios nos próximos 7 dias</h2><Link href="/admin/agenda" className="muted">Abrir agenda →</Link></div>{(agendamentos??[]).length===0?<p className="muted">Nenhum ensaio agendado para os próximos sete dias.</p>:(agendamentos??[]).map(a=><article className="notification-item" key={a.id}><strong>{a.title}</strong><span>{fmtDataHora(a.starts_at)} · {a.location}</span><Link href={`/admin/clientes/${a.client_id}`}>Abrir cliente →</Link></article>)}</section>
 </main></>;
}
