import { createClient } from '@supabase/supabase-js';

// Cliente anônimo, sem cookies: usado para ler o portfólio público
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
