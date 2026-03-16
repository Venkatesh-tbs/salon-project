import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  
  const isLoginPage = request.nextUrl.pathname === '/admin/login' || request.nextUrl.pathname === '/staff/login';
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin') && !isLoginPage;
  const isStaffRoute = request.nextUrl.pathname.startsWith('/staff') && !isLoginPage;
  const isProtected = isAdminRoute || isStaffRoute;

  // 1. Unauthenticated users trying to access protected routes
  if (isProtected && !session) {
    if (isAdminRoute) {
       return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    if (isStaffRoute) {
        return NextResponse.redirect(new URL('/staff/login', request.url));
    }
  }

  // 2. Authenticated users trying to access login pages
  // Note: We'd ideally verify the session role here, but we'll do it on the page level or API level
  // for simplicity in edge middleware, or use `next-firebase-auth-edge` if strictly needed.
  if (isLoginPage && session) {
    // Basic redirect, role verification should happen in the dashboard page to avoid
    // edge runtime limitations with full firebase-admin.
     if (request.nextUrl.pathname === '/admin/login') {
         return NextResponse.redirect(new URL('/admin/dashboard', request.url));
     }
     if (request.nextUrl.pathname === '/staff/login') {
         return NextResponse.redirect(new URL('/staff/dashboard', request.url));
     }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/staff/:path*',
  ],
};
