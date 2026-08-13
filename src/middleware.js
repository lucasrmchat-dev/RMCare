import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/session';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const adminToken = request.cookies.get('rmagenda_auth')?.value || request.cookies.get('rmcare_auth')?.value;

  if (pathname.startsWith('/admin') && !adminToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname === '/login' && adminToken) {
    const session = await verifyAdminSession(adminToken);
    if (session?.sub === 'master') {
      return NextResponse.redirect(new URL('/admin/sistema', request.url));
    }
    return NextResponse.redirect(new URL('/admin/empresa', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
