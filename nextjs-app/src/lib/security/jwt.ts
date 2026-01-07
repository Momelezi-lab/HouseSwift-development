import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production-min-32-chars';
const JWT_ACCESS_TOKEN_EXPIRE = process.env.JWT_ACCESS_TOKEN_EXPIRE || '15m'; // 15 minutes
const JWT_REFRESH_TOKEN_EXPIRE = process.env.JWT_REFRESH_TOKEN_EXPIRE || '7d'; // 7 days

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  name: string;
}

/**
 * Generate JWT access token (short-lived)
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      name: payload.name,
      type: 'access',
    },
    JWT_SECRET,
    {
      expiresIn: JWT_ACCESS_TOKEN_EXPIRE,
      issuer: 'homeswift',
      audience: 'homeswift-users',
    }
  );
}

/**
 * Generate JWT refresh token (long-lived)
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      type: 'refresh',
    },
    JWT_SECRET,
    {
      expiresIn: JWT_REFRESH_TOKEN_EXPIRE,
      issuer: 'homeswift',
      audience: 'homeswift-users',
    }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'homeswift',
      audience: 'homeswift-users',
    }) as any;

    if (decoded.type !== 'access') {
      return null; // Only accept access tokens
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name || '',
    };
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'homeswift',
      audience: 'homeswift-users',
    }) as any;

    if (decoded.type !== 'refresh') {
      return null; // Only accept refresh tokens
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name || '',
    };
  } catch (error) {
    return null;
  }
}

/**
 * Set refresh token in httpOnly cookie
 */
export async function setRefreshTokenCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    path: '/',
  });
}

/**
 * Get refresh token from cookie
 */
export async function getRefreshTokenCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('refreshToken')?.value || null;
}

/**
 * Clear refresh token cookie
 */
export async function clearRefreshTokenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('refreshToken');
}

/**
 * Extract token from Authorization header
 */
export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

