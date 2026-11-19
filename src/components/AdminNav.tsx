import Link from 'next/link';
import Logo from './Logo';
import { sair } from '@/app/auth-actions';

export default function AdminNav() {
  return (
    <header className="topbar">
      <Logo />
      <nav className="nav" aria-label="Painel">
        <Link href="/admin">Clientes e mensagens</Link>
        <Link href="/admin/portfolio">Portfólio do site</Link>
        <Link href="/admin/video-demo">Vídeo demonstrativo</Link>
        <form action={sair}>
          <button type="submit" className="btn btn-outline btn-small">
            Sair
          </button>
        </form>
      </nav>
    </header>
  );
}
