import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dáblio | Fotografia e Filmagem',
  description: 'Fotografia e filmagem com olhar sensível. Peça seu orçamento e acesse suas fotos na área do cliente.',
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
