// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UserRole } from '@/constants/userRoles';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const userRole = request.cookies.get('role')?.value;
    // Define route types
  const isAgentRoute = request.nextUrl.pathname.startsWith('/agent-dashboard');
  const isHostRoute = request.nextUrl.pathname.startsWith('/host-dashboard');
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');
  const isProfileRoute = request.nextUrl.pathname.startsWith('/profile');
  const isLoginRoute = request.nextUrl.pathname === '/login';
  
  // All routes that require authentication
  const isAuthRoute = isAgentRoute || isHostRoute || isDashboardRoute || isProfileRoute;
  
  // If the user is not authenticated and trying to access an auth route
  if (!session && isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If the user is authenticated and trying to access login page
  if (session && isLoginRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
    // Role-based access control
  if (session && userRole) {
    // Restrict agent dashboard to agents only
    if (isAgentRoute && userRole !== UserRole.AGENT) {
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }
    
    // Restrict host dashboard to hosts only
    if (isHostRoute && userRole !== UserRole.HOST) {
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }
  }
  
  return NextResponse.next();
}

// Define routes that need authentication or role-based protection
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/agent-dashboard/:path*',
    '/host-dashboard/:path*',
    '/profile/:path*',
    '/access-denied',
    '/login'
  ],
};
