'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { redefinirSenha, type NovaSenhaState } from '@/app/admin/actions';

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-outline" disabled={pending}>
      {pending ? 'Gerando…' : 'Gerar nova senha'}
    </button>
  );
}

export default function RedefinirSenhaForm({ id }: { id: string }) {
  const [state, formAction] = useFormState<NovaSenhaState, FormData>(redefinirSenha, undefined);

  return (
    <form action={formAction} className="form">
      <input type="hidden" name="id" value={id} />
      <div>
        <Enviar />
      </div>
      {state?.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="credenciais" style={{ margin: 0 }}>
          Nova senha: <strong>{state.senha}</strong>
        </p>
      )}
    </form>
  );
}
