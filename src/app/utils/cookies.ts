// src/app/utils/cookies.ts
/**
 * Utility functions for handling cookies
 */

/**
 * Set a cookie with a specific expiration time in days
 */
export const setCookie = (name: string, value: string, days: number = 7) => {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}`;
};

/**
 * Get a cookie by name
 */
export const getCookie = (name: string): string | undefined => {
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(name + '=')) {
      return cookie.substring(name.length + 1);
    }
  }
  return undefined;
};

/**
 * Delete a cookie by name
 */
export const deleteCookie = (name: string) => {
  document.cookie = `${name}=; path=/; max-age=0`;
};
