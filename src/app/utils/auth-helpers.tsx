// src/app/utils/auth-helpers.ts
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { UserRole } from '@/constants/userRoles';

/**
 * A hook to protect routes based on authentication status and user role
 * @param requiredRole The role required to access the page, or null if any authenticated user can access
 * @returns Loading state
 */
export function useRouteProtection(requiredRole: UserRole | null = null) {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    // If still loading auth state, don't do anything yet
    if (loading) return;
    
    // If not authenticated, redirect to login
    if (!user) {
      router.push('/login');
      return;
    }
    
    // If a specific role is required and user doesn't have it
    if (requiredRole !== null && userRole !== requiredRole) {
      router.push('/access-denied');
      return;
    }
  }, [user, userRole, loading, router, requiredRole]);
  
  return loading;
}

/**
 * A higher-order component to wrap protected pages
 * @param Component The component to wrap
 * @param requiredRole The role required to access the page, or null if any authenticated user can access
 * @returns A wrapped component with route protection
 */
export function withRouteProtection(Component: React.ComponentType, requiredRole: UserRole | null = null) {
  return function ProtectedRoute(props: React.ComponentProps<typeof Component>) {
    const loading = useRouteProtection(requiredRole);
    
    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
}
