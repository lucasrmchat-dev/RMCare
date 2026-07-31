import { NextResponse } from 'next/server';

export function middleware(request) {
  // Pega o token de autenticação (ajuste o nome do cookie conforme o que sua action authenticateUser gera)
  const token = request.cookies.get('seu_cookie_de_autenticacao')?.value;
  const path = request.nextUrl.pathname;

  // Se tentar acessar área restrita sem token, redireciona para o login
  if (path.startsWith('/admin') || path.startsWith('/paciente')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/paciente/:path*'],
};