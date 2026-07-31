import { NextResponse } from 'next/server';

export function middleware(request) {
  // 1. Lemos os cookies reais que nossa função de login gera
  const adminToken = request.cookies.get('rmcare_auth')?.value;
  const pacienteToken = request.cookies.get('rmcare_auth_paciente')?.value;
  
  const path = request.nextUrl.pathname;

  // 2. Proteção das rotas Administrativas (Master e Empresa)
  if (path.startsWith('/admin')) {
    if (!adminToken) {
      // Se não tem cookie de admin, chuta de volta pro login
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 3. Proteção das rotas do Paciente
  if (path.startsWith('/paciente')) {
    if (!pacienteToken) {
      // Se não tem cookie de paciente, chuta pro login
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Se tem o cookie correto, deixa a requisição passar normalmente
  return NextResponse.next();
}

// 4. Diz ao Next.js quais rotas esse middleware deve vigiar
export const config = {
  matcher: [
    '/admin/:path*', 
    '/paciente/:path*'
  ],
};