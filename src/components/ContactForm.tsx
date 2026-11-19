'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { enviarMensagem, type ContatoState } from '@/app/actions';

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? 'Enviando…' : 'Enviar mensagem'}
    </button>
  );
}

export default function ContactForm() {
  const [state, formAction] = useFormState<ContatoState, FormData>(enviarMensagem, undefined);

  if (state?.ok) {
    return (
      <div className="form" role="status">
        <h3 className="serif" style={{ fontSize: 32, margin: 0 }}>Mensagem enviada!</h3>
        <p className="muted">Obrigado pelo contato. Respondo o mais rápido possível.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="form">
      {/* Campo escondido contra robôs */}
      <input
        type="text"
        name="site"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />
      <div className="field">
        <label htmlFor="nome">Nome</label>
        <input id="nome" name="nome" type="text" placeholder="Seu nome" required maxLength={120} />
      </div>
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" placeholder="voce@email.com" required maxLength={160} />
      </div>
      <div className="field">
        <label htmlFor="servico">Serviço de interesse</label>
        <select id="servico" name="servico" defaultValue="Fotografia">
          <option>Fotografia</option>
          <option>Filmagem</option>
          <option>Fotografia e filmagem</option>
          <option>Ainda não sei</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="mensagem">Mensagem</label>
        <textarea
          id="mensagem"
          name="mensagem"
          rows={5}
          placeholder="Conte sobre data, local e o que você imagina"
          required
          maxLength={3000}
        />
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
  );
}
