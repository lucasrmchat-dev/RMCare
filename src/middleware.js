import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const adminToken = request.cookies.get('rmagenda_auth')?.value || request.cookies.get('rmcare_auth')?.value;
  const pacienteToken = request.cookies.get('rmagenda_auth_paciente')?.value || request.cookies.get('rmcare_auth_paciente')?.value;

  if (pathname.startsWith('/admin') && !adminToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname === '/login' && adminToken) {
    return NextResponse.redirect(new URL('/admin/empresa', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
