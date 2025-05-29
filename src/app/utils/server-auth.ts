// c:\Users\jainm\OneDrive\Desktop\booking-list\src\app\utils\server-auth.ts
import { NextRequest } from 'next/server';

/**
 * Extracts the token from the NextRequest.
 * IMPORTANT: You need to move the actual implementation of this function
 * from its original location (e.g., src/app/utils/auth-helpers.tsx or a related file)
 * to here. This file should ONLY contain server-side compatible code
 * and must NOT include the 'use client'; directive or import client-side hooks.
 */
export async function getTokenFromRequest(req: NextRequest): Promise<string | null> {
  // Placeholder - Replace with your actual logic:
  // This is a common way to get a Bearer token from headers
  const authorizationHeader = req.headers.get('authorization');
  if (authorizationHeader && authorizationHeader.toLowerCase().startsWith('bearer ')) {
    return authorizationHeader.substring(7); // Length of "Bearer "
  }

  // Alternatively, you might be getting it from cookies:
  // const tokenCookie = req.cookies.get('your-token-cookie-name');
  // if (tokenCookie) {
  //   return tokenCookie.value;
  // }

  console.warn("getTokenFromRequest in server-auth.ts is using a placeholder. Please move your actual implementation here.");
  return null;
}

// If there were other server-side utility functions in auth-helpers.tsx
// that are used by server components, move them here as well.
