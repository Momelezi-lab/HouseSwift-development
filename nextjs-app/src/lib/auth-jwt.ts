/**
 * JWT Authentication Utilities (Client-side)
 * 
 * This module handles JWT token storage and management on the client side.
 * Tokens are stored in localStorage for backward compatibility.
 * In production, consider using httpOnly cookies only (server-side).
 */

const ACCESS_TOKEN_KEY = 'homeswift_access_token';
const USER_KEY = 'homeswift_user';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  registered: string;
}

/**
 * Store access token
 */
export function setAccessToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
}

/**
 * Get access token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Remove access token
 */
export function removeAccessToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

/**
 * Store user data
 */
export function setUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

/**
 * Get user data
 */
export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
}

/**
 * Remove user data
 */
export function removeUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_KEY);
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null && getUser() !== null;
}

/**
 * Check if user is admin
 */
export function isAdmin(): boolean {
  const user = getUser();
  return user?.role === 'admin' || false;
}

/**
 * Check if user is provider
 */
export function isProvider(): boolean {
  const user = getUser();
  return user?.role === 'provider' || false;
}

/**
 * Check if user is customer
 */
export function isCustomer(): boolean {
  const user = getUser();
  return user?.role === 'customer' || false;
}

/**
 * Logout - clear all auth data
 */
export function logout(): void {
  removeAccessToken();
  removeUser();
}

/**
 * Refresh access token using refresh token from httpOnly cookie
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include', // Include httpOnly cookies
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.accessToken) {
      setAccessToken(data.accessToken);
      if (data.user) {
        setUser(data.user);
      }
      return data.accessToken;
    }

    return null;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

/**
 * Get authorization header with access token
 */
export function getAuthHeader(): string | null {
  const token = getAccessToken();
  return token ? `Bearer ${token}` : null;
}

