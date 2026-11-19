import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://dabliofoto.com.br'),
  title: 'Dáblio | Fotografia e Filmagem',
  description: 'Fotografia e filmagem com olhar sensível. Peça seu orçamento e acesse suas fotos na área do cliente.',
  openGraph: { title: 'Dáblio | Fotografia e Filmagem', description: 'Histórias contadas em luz e movimento.', type: 'website', locale: 'pt_BR', siteName: 'Dáblio' },
  twitter: { card: 'summary_large_image', title: 'Dáblio | Fotografia e Filmagem', description: 'Histórias contadas em luz e movimento.' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
