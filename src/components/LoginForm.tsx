'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { LoginState } from '@/app/auth-actions';

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? 'Entrando…' : 'Entrar'}
    </button>
  );
}

export default function LoginForm({
  action,
  modo,
}: {
  action: (prev: LoginState, formData: FormData) => Promise<LoginState>;
  modo: 'cliente' | 'admin';
}) {
  const [state, formAction] = useFormState(action, undefined);

  return (
    <form action={formAction} className="card form">
      {modo === 'cliente' ? (
        <div className="field">
          <label htmlFor="codigo">Código de acesso</label>
          <input
            id="codigo"
            name="codigo"
            type="text"
            autoComplete="username"
            autoCapitalize="characters"
            placeholder="Ex.: K7M2XP"
            required
          />
        </div>
      ) : (
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
        </div>
      )}
      <div className="field">
        <label htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required />
      </div>
      {state?.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
      <Enviar />
    </form>
  );
}
