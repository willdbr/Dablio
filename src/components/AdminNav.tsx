import Link from 'next/link';
import Logo from './Logo';
import { sair } from '@/app/auth-actions';

export default function AdminNav() {
  return (
    <header className="topbar">
      <Logo />
      <nav className="nav" aria-label="Painel">
        <Link href="/admin">Painel</Link>
        <Link href="/admin/financeiro">Financeiro</Link>
        <Link href="/admin/agenda">Agenda</Link>
        <Link href="/admin/portfolio">Portfólio do site</Link>
        <Link href="/admin/video-demo">Vídeo demonstrativo</Link>
        <Link href="/admin/conteudo">Conteúdo do site</Link>
        <form action={sair}>
          <button type="submit" className="btn btn-outline btn-small">
            Sair
          </button>
        </form>
      </nav>
    </header>
  );
}
