import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Mantém a sessão atualizada e bloqueia as áreas restritas para quem não entrou.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const ehLogin = path === '/cliente/login' || path === '/admin/login';

  // Temporário para diagnóstico: deixa /cliente chegar à página, que exibirá o motivo do redirecionamento.\n  if (!user && !ehLogin && !path.startsWith('/cliente')) {
    const url = request.nextUrl.clone();
    url.pathname = path.startsWith('/admin') ? '/admin/login' : '/cliente/login';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/cliente/:path*', '/admin/:path*'],
};
