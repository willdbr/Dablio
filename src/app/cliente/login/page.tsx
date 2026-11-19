import Link from 'next/link';
import Logo from '@/components/Logo';
import LoginForm from '@/components/LoginForm';
import { loginCliente } from '@/app/auth-actions';
import { WHATSAPP_URL } from '@/lib/config';

export const metadata = { title: 'Área do cliente | Dáblio', robots: { index: false, follow: false } };

export default function LoginCliente() {
  return (
    <>
      <header className="topbar">
        <Logo />
        <Link href="/" className="muted">
          ← Voltar ao site
        </Link>
      </header>
      <main className="login-wrap">
        <div className="login-box">
          <div>
            <div className="eyebrow">Área do cliente</div>
            <h1 className="serif" style={{ fontSize: 48, lineHeight: 1.1, margin: '12px 0 0' }}>
              Veja suas fotos
            </h1>
            <p className="muted" style={{ margin: '12px 0 0' }}>
              Use o código e a senha que enviei para você.
            </p>
          </div>
          <LoginForm action={loginCliente} modo="cliente" />
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            Perdeu o acesso ou ele expirou?{' '}
            <a href={WHATSAPP_URL} style={{ color: 'var(--accent)' }}>
              Peça um novo pelo WhatsApp
            </a>
            .
          </p>
        </div>
      </main>
    </>
  );
}
