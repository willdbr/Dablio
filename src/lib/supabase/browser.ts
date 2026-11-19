import { createBrowserClient } from '@supabase/ssr';

// Cliente Supabase do navegador (usado no envio de fotos pelo painel)
export function createBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
