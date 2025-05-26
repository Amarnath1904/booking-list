// src/app/utils/cookies.ts
/**
 * Utility functions for handling cookies
 */

/**
 * Set a cookie with a specific expiration time in days
 */
export const setCookie = (name: string, value: string, days: number = 7) => {
  if (typeof document === 'undefined') return; // Skip on server-side
  
  const maxAge = days * 24 * 60 * 60;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; expires=${expires.toUTCString()}; SameSite=Lax`;
};

/**
 * Get a cookie by name
 */
export const getCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined; // Skip on server-side
  
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(name + '=')) {
      return decodeURIComponent(cookie.substring(name.length + 1));
    }
  }
  return undefined;
};

/**
 * Delete a cookie by name
 */
export const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return; // Skip on server-side
  
  document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
};

/**
 * Check if a cookie exists
 */
export const hasCookie = (name: string): boolean => {
  return getCookie(name) !== undefined;
};
