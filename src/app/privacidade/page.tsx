import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidade | Dáblio',
  description: 'Como a Dáblio utiliza e protege os dados enviados pelo site e pela área do cliente.',
};

export default function Privacidade() {
  return (
    <main className="page stack">
      <div>
        <Link href="/" className="muted">← Voltar ao site</Link>
        <h1 style={{ marginTop: 16 }}>Política de Privacidade</h1>
        <p className="muted">Última atualização: 19 de novembro de 2026</p>
      </div>
      <section className="stack">
        <div>
          <h2>Dados coletados</h2>
          <p>Quando você envia uma mensagem, recebemos seu nome, e-mail, serviço de interesse e o conteúdo da mensagem. Para clientes, tratamos os dados necessários para criar e administrar o acesso à galeria e entregar fotos e links de vídeos.</p>
        </div>
        <div>
          <h2>Finalidade e compartilhamento</h2>
          <p>Os dados são utilizados para responder solicitações, prestar os serviços contratados, disponibilizar materiais e administrar os acessos. O site utiliza serviços de hospedagem e armazenamento de terceiros, como Vercel e Supabase, para operar.</p>
        </div>
        <div>
          <h2>Armazenamento e segurança</h2>
          <p>As galerias de clientes são privadas e protegidas por autenticação e regras de acesso. Os links de vídeos de clientes podem apontar para plataformas externas, sujeitas às políticas próprias desses serviços.</p>
        </div>
        <div>
          <h2>Prazo e direitos</h2>
          <p>Os materiais ficam disponíveis pelo prazo informado ao cliente. Você pode solicitar acesso, correção ou exclusão de dados pessoais, observadas as obrigações legais aplicáveis, pelo canal de contato informado no site.</p>
        </div>
        <div>
          <h2>Contato</h2>
          <p>Para dúvidas ou solicitações relacionadas à privacidade, entre em contato pelo formulário ou WhatsApp disponíveis na página inicial.</p>
        </div>
      </section>
    </main>
  );
}
