import Link from 'next/link';
import Logo from '@/components/Logo';
import ContactForm from '@/components/ContactForm';
import { createPublicClient } from '@/lib/supabase/public';
import { INSTAGRAM_URL, WHATSAPP_URL } from '@/lib/config';

// Atualiza a lista do portfólio no máximo a cada 60 segundos
export const revalidate = 60;

const ALTURAS = [440, 300, 380, 320, 460, 280];

async function carregarPortfolio(): Promise<{ fotos: string[]; erro: string }> {
  try {
    const sb = createPublicClient();
    const { data, error } = await sb.storage
      .from('portfolio')
      .list('', { limit: 60, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) return { fotos: [], erro: `Erro ao listar portfolio: ${error.message} (código: ${error.name ?? 'sem código'})` };

    return {
      fotos: (data ?? [])
        .filter((f) => f.id && !f.name.startsWith('.'))
        .map((f) => sb.storage.from('portfolio').getPublicUrl(f.name).data.publicUrl),
      erro: '',
    };
  } catch (error) {
    return { fotos: [], erro: error instanceof Error ? error.message : String(error) };
  }
}

export default async function Home() {
  const resultadoPortfolio = await carregarPortfolio();
  const fotos = resultadoPortfolio.fotos;
  const destaque = fotos[0];

  return (
    <>
      <header className="topbar">
        <Logo />
        <nav className="nav" aria-label="Principal">
          <a href="#portfolio">Portfólio</a>
          <a href="#servicos">Serviços</a>
          <a href="#contato">Contato</a>
          <Link href="/cliente/login" className="nav-pill">
            Área do cliente
          </Link>
        </nav>
      </header>

      <main>
        <section id="inicio" className="hero">
          <div className="hero-text">
            <div className="eyebrow">Fotografia · Filmagem</div>
            <h1>Histórias contadas em luz e movimento.</h1>
            <p>
              Registro momentos reais com um olhar sensível e cuidadoso, em fotos e vídeos que você
              vai querer rever sempre.
            </p>
            <div className="row">
              <a href="#contato" className="btn">
                Pedir orçamento
              </a>
              <a href="#portfolio" className="btn btn-outline">
                Ver portfólio
              </a>
            </div>
          </div>
          <div className="hero-media">
            {destaque ? (
              <img src={destaque} alt="Trabalho de fotografia da Dáblio" />
            ) : (
              <div className="placeholder" style={{ minHeight: 560 }}>
                Foto de destaque
              </div>
            )}
          </div>
        </section>

        <section id="servicos" className="section">
          <div className="section-head">
            <div className="eyebrow">Serviços</div>
            <h2 className="section-title">O que eu faço</h2>
          </div>
          <div className="cards">
            <div className="service">
              <div className="num">01</div>
              <h3>Fotografia</h3>
              <p>
                Ensaios, eventos e coberturas com atenção aos detalhes e à luz de cada lugar. As
                fotos tratadas ficam disponíveis para você na área do cliente.
              </p>
              <a href="#contato" className="more">
                Pedir orçamento →
              </a>
            </div>
            <div className="service">
              <div className="num">02</div>
              <h3>Filmagem</h3>
              <p>
                Vídeos que guardam o movimento, o som e a emoção do dia. Da captação à edição final,
                com entrega online na sua área do cliente.
              </p>
              <a href="#contato" className="more">
                Pedir orçamento →
              </a>
            </div>
          </div>
        </section>

        <section id="portfolio" className="section">
          <div className="section-head">
            <div className="eyebrow">Portfólio</div>
            <h2 className="section-title">Trabalhos recentes</h2>
          </div>
          {resultadoPortfolio.erro && (
            <p role="alert" className="muted">
              Diagnóstico do portfólio: {resultadoPortfolio.erro}
            </p>
          )}
          <div className="masonry">
            {fotos.length > 0
              ? fotos.map((src, i) => <img key={src} src={src} alt={`Foto ${i + 1} do portfólio`} loading="lazy" />)
              : ALTURAS.map((h, i) => (
                  <div key={i} className="placeholder" style={{ height: h }}>
                    Foto {i + 1}
                  </div>
                ))}
          </div>
        </section>

        <section id="cliente" className="client-section">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="eyebrow">Área do cliente</div>
            <h2 className="section-title">Suas fotos, em um só lugar.</h2>
            <p className="muted" style={{ margin: 0, maxWidth: 480 }}>
              Já fez uma sessão comigo? Entre com o código e a senha que enviei para você e veja ou
              baixe o seu material. O acesso fica disponível por 90 dias.
            </p>
          </div>
          <div>
            <Link href="/cliente/login" className="btn">
              Entrar na área do cliente
            </Link>
          </div>
        </section>

        <section id="contato" className="section">
          <div className="split">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="eyebrow">Contato</div>
              <h2 className="section-title">Vamos conversar sobre o seu projeto</h2>
              <p className="muted" style={{ margin: 0, maxWidth: 420 }}>
                Conte o que você tem em mente. Respondo o mais rápido possível.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                <a href={WHATSAPP_URL} className="pill-link" target="_blank" rel="noopener noreferrer">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 21l1.6-4.8A8.5 8.5 0 1 1 8 19.5L3 21z" />
                    <path d="M9 9.5c.5 2.5 2.5 4.5 5 5l1.2-1.2-2-1-.8.8c-.9-.4-1.6-1.1-2-2l.8-.8-1-2L9 9.5z" />
                  </svg>
                  <span>Chamar no WhatsApp</span>
                </a>
                <a href={INSTAGRAM_URL} className="pill-link" target="_blank" rel="noopener noreferrer">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.8" />
                  </svg>
                  <span>Ver no Instagram</span>
                </a>
              </div>
            </div>
            <ContactForm />
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>© {new Date().getFullYear()} Dáblio. Todos os direitos reservados.</span>
        <span>Fotografia · Filmagem</span>
      </footer>
    </>
  );
}
