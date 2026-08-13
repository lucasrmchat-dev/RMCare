import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const adminToken = request.cookies.get('rmagenda_auth')?.value || request.cookies.get('rmcare_auth')?.value;

  // Protege todas as rotas administrativas se o usuário não tiver cookie de sessão
  if (pathname.startsWith('/admin') && !adminToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
