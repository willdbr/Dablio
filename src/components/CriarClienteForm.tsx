'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { criarCliente, type NovoClienteState } from '@/app/admin/actions';
import { DIAS_PADRAO } from '@/lib/config';
import { fmtData } from '@/lib/format';

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? 'Criando…' : 'Criar acesso'}
    </button>
  );
}

export default function CriarClienteForm() {
  const [state, formAction] = useFormState<NovoClienteState, FormData>(criarCliente, undefined);

  return (
    <div className="card">
      <h2 className="serif" style={{ fontSize: 32, margin: '0 0 16px' }}>Novo cliente</h2>
      <form action={formAction} className="form" style={{ maxWidth: 520 }}>
        <div className="field">
          <label htmlFor="nome">Nome do cliente</label>
          <input id="nome" name="nome" type="text" required maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="dias">Validade do acesso (dias)</label>
          <input id="dias" name="dias" type="number" min={1} max={730} defaultValue={DIAS_PADRAO} />
        </div>
        {state?.error && (
          <p role="alert" className="error">
            {state.error}
          </p>
        )}
        <div>
          <Enviar />
        </div>
      </form>

      {state?.ok && (
        <div className="credenciais" role="status">
          <p style={{ margin: 0 }}>
            <strong>Acesso criado para {state.nome}.</strong> Copie agora e envie ao cliente: a senha
            não aparece de novo (se perder, é só redefinir).
          </p>
          <p style={{ margin: 0 }}>
            Código: <strong>{state.codigo}</strong>
            <br />
            Senha: <strong>{state.senha}</strong>
            <br />
            Válido até: <strong>{state.expiraEm ? fmtData(state.expiraEm) : ''}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
