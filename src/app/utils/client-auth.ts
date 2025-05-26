'use client';

import { auth } from '@/firebase/config';

/**
 * Gets the current authenticated user ID on the client side
 * @returns Firebase user ID if authenticated, null otherwise
 */
export function getClientAuth() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const user = auth.currentUser;
  return user ? user.uid : null;
}
