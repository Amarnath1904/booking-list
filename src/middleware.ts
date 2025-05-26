// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UserRole } from '@/constants/userRoles';

export function middleware(request: NextRequest) {
  // Get auth cookies
  const session = request.cookies.get('session')?.value;
  const userRole = request.cookies.get('role')?.value;
  const firebaseUid = request.cookies.get('firebaseUid')?.value;
  
  // Check if user is authenticated
  const isAuthenticated = session && firebaseUid;
  
  // Define route types
  const isAgentRoute = request.nextUrl.pathname.startsWith('/agent-dashboard');
  const isHostRoute = request.nextUrl.pathname.startsWith('/host-dashboard');
  const isDashboardRoute = request.nextUrl.pathname === '/dashboard' || request.nextUrl.pathname === '/dashboard/';
  const isProfileRoute = request.nextUrl.pathname.startsWith('/profile');
  const isLoginRoute = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/login/';
  
  // All routes that require authentication
  const isAuthRoute = isAgentRoute || isHostRoute || isDashboardRoute || isProfileRoute;
  
  // Don't redirect if there's a redirect query parameter to prevent loops
  const hasRedirectParam = request.nextUrl.searchParams.has('redirected');
  
  // If the user is not authenticated and trying to access an auth route
  if (!isAuthenticated && isAuthRoute && !hasRedirectParam) {
    console.log(`Redirecting unauthenticated user from ${request.nextUrl.pathname} to /login`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirected', 'true');
    return NextResponse.redirect(loginUrl);
  }
  
  // If the user is authenticated and trying to access login page
  if (isAuthenticated && isLoginRoute && !hasRedirectParam) {
    // Redirect to the appropriate dashboard based on role
    let redirectUrl;
    
    if (userRole === UserRole.HOST) {
      console.log(`Redirecting authenticated host from /login to /host-dashboard`);
      redirectUrl = new URL('/host-dashboard', request.url);
    } else if (userRole === UserRole.AGENT) {
      console.log(`Redirecting authenticated agent from /login to /agent-dashboard`);
      redirectUrl = new URL('/agent-dashboard', request.url);
    } else {
      console.log(`Redirecting authenticated user without role from /login to /dashboard`);
      redirectUrl = new URL('/dashboard', request.url);
    }
    
    redirectUrl.searchParams.set('redirected', 'true');
    return NextResponse.redirect(redirectUrl);
  }    // Role-based access control
  if (session && userRole) {
    // Restrict agent dashboard to agents only
    if (isAgentRoute && userRole !== UserRole.AGENT && !hasRedirectParam) {
      const redirectUrl = new URL('/access-denied', request.url);
      redirectUrl.searchParams.set('redirected', 'true');
      return NextResponse.redirect(redirectUrl);
    }
    
    // Restrict host dashboard to hosts only
    if (isHostRoute && userRole !== UserRole.HOST && !hasRedirectParam) {
      const redirectUrl = new URL('/access-denied', request.url);
      redirectUrl.searchParams.set('redirected', 'true');
      return NextResponse.redirect(redirectUrl);
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
    '/login',
    '/login/:path*'
  ],
};
