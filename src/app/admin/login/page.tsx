import Logo from '@/components/Logo';
import LoginForm from '@/components/LoginForm';
import { loginAdmin } from '@/app/auth-actions';

export const metadata = { title: 'Painel | Dáblio', robots: { index: false } };

export default function LoginAdmin() {
  return (
    <>
      <header className="topbar">
        <Logo />
      </header>
      <main className="login-wrap">
        <div className="login-box">
          <div>
            <div className="eyebrow">Painel</div>
            <h1 className="serif" style={{ fontSize: 48, lineHeight: 1.1, margin: '12px 0 0' }}>
              Entrar
            </h1>
          </div>
          <LoginForm action={loginAdmin} modo="admin" />
        </div>
      </main>
    </>
  );
}
