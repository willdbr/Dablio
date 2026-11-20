import Link from 'next/link';
import AdminNav from '@/components/AdminNav';
import { exigirAdmin } from '@/lib/auth';
import { fmtData } from '@/lib/format';
import { atualizarValorContrato, registrarPagamento, excluirPagamento } from '../actions';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Financeiro | Dáblio', robots: { index: false } };
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const hojeBrasil = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export default async function Financeiro({ searchParams }: { searchParams?: { resultado?: string } }) {
 const {supabase}=await exigirAdmin();
 const [{data:clientes},{data:contratos},{data:pagamentos}]=await Promise.all([
  supabase.from('clients').select('id,name').order('name'),
  supabase.from('client_contracts').select('client_id,contract_value'),
  supabase.from('finance_payments').select('id,client_id,amount,payment_method,paid_at,notes').order('paid_at',{ascending:false})
 ]);
 const lista=clientes??[], pagos=pagamentos??[];
 const valores=new Map<string,number>((contratos??[]).map(c=>[c.client_id,Number(c.contract_value)] as [string,number]));
 const contratado=lista.reduce((s,c)=>s+(valores.get(c.id)??0),0);
 const recebido=pagos.reduce((s,p)=>s+Number(p.amount),0);
 const aberto=lista.reduce((s,c)=>s+Math.max(0,(valores.get(c.id)??0)-pagos.filter(p=>p.client_id===c.id).reduce((a,p)=>a+Number(p.amount),0)),0);
 return <><AdminNav/><main className="page stack">
 <div><Link href="/admin" className="muted">← Voltar ao painel</Link><h1 style={{marginTop:16}}>Financeiro</h1><p className="muted" style={{margin:0}}>Controle manual dos contratos e pagamentos recebidos fora do site.</p></div>
 {searchParams?.resultado && <p className="notice" role="status">{({contrato:'Valor do contrato salvo.',pagamento:'Pagamento registrado com sucesso.',excluido:'Pagamento excluído.'} as Record<string,string>)[searchParams.resultado] ?? 'Alteração concluída.'}</p>}
 <section className="summary-grid"><article className="summary-card"><span className="muted">Valor contratado</span><strong>{brl(contratado)}</strong></article><article className="summary-card"><span className="muted">Total recebido</span><strong>{brl(recebido)}</strong></article><article className="summary-card"><span className="muted">Saldo em aberto</span><strong>{brl(aberto)}</strong></article></section>
 <section className="stack" style={{gap:20}}><div><h2 className="serif" style={{fontSize:30,margin:0}}>Clientes e pagamentos</h2><p className="muted" style={{margin:0}}>Defina o valor do contrato e registre cada parcela.</p></div>
 {lista.map(c=>{const hist=pagos.filter(p=>p.client_id===c.id);const total=hist.reduce((s,p)=>s+Number(p.amount),0);const contrato=valores.get(c.id)??0;const saldo=Math.max(0,contrato-total);return <article className="form finance-client" key={c.id}>
 <div className="row" style={{justifyContent:'space-between',alignItems:'center'}}><div><h3 style={{margin:0}}>{c.name}</h3><span className="muted">{hist.length} pagamento(s) registrado(s)</span></div><strong>{brl(saldo)} <small className="muted">em aberto</small></strong></div>
 <form action={atualizarValorContrato} className="row finance-form"><input type="hidden" name="client_id" value={c.id}/><div className="field"><label>Valor total do contrato (R$)</label><input name="contract_value" type="number" min="0" step="0.01" required defaultValue={contrato.toFixed(2)}/></div><button className="btn btn-small" type="submit">Salvar contrato</button></form>
 <form action={registrarPagamento} className="row finance-form"><input type="hidden" name="client_id" value={c.id}/><div className="field"><label>Valor recebido (R$)</label><input name="amount" type="number" min="0.01" step="0.01" required placeholder="0,00"/></div><div className="field"><label>Forma</label><select name="payment_method"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Transferência</option><option>Outro</option></select></div><div className="field"><label>Data</label><input name="paid_at" type="date" required defaultValue={hojeBrasil}/></div><div className="field"><label>Observação</label><input name="notes" maxLength={250} placeholder="Opcional"/></div><button className="btn btn-small" type="submit">Registrar pagamento</button></form>
 <div className="finance-totals"><span>Contrato: <b>{brl(contrato)}</b></span><span>Recebido: <b>{brl(total)}</b></span><span>Saldo: <b>{brl(saldo)}</b></span></div>
 {hist.length>0&&<div className="table-wrap"><table className="table"><thead><tr><th>Data</th><th>Valor</th><th>Forma</th><th>Observação</th><th></th></tr></thead><tbody>{hist.map(p=><tr key={p.id}><td>{fmtData(p.paid_at + 'T12:00:00-03:00')}</td><td>{brl(Number(p.amount))}</td><td>{p.payment_method}</td><td>{p.notes||'—'}</td><td><form action={excluirPagamento}><input type="hidden" name="id" value={p.id}/><button className="btn btn-danger btn-small" type="submit">Excluir</button></form></td></tr>)}</tbody></table></div>}
 </article>})}{lista.length===0&&<p className="muted">Cadastre um cliente para começar.</p>}</section></main></>;
}
