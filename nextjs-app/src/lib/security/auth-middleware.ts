import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenFromHeader, verifyToken } from '@/lib/security/jwt';

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

/**
 * Get authenticated user from request
 * Supports JWT token authentication
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    // Try to get user from Authorization header (Bearer token)
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        return {
          id: payload.userId,
          email: payload.email,
          name: payload.name,
          role: payload.role,
        };
      }
    }

    // Fallback: Try to get from headers (for backward compatibility with localStorage)
    const userEmail = request.headers.get('x-user-email');
    if (userEmail) {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true, email: true, name: true, role: true },
      });
      if (user) {
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'customer',
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Auth middleware error:', error);
    return null;
  }
}

/**
 * Require authentication middleware
 */
export function requireAuth(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    return handler(request, user);
  };
}

/**
 * Require specific role middleware
 */
export function requireRole(
  roles: string[],
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    if (!roles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    return handler(request, user);
  };
}

/**
 * Get user from request body or headers (for API routes that receive user info)
 * This is a helper for routes that receive user email in the request
 */
export async function getUserFromRequest(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    // Try to get from request body
    const body = await request.json().catch(() => null);
    if (body?.userEmail) {
      const user = await prisma.user.findUnique({
        where: { email: body.userEmail },
        select: { id: true, email: true, name: true, role: true },
      });
      if (user) {
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'customer',
        };
      }
    }

    // Try to get from headers
    const userEmail = request.headers.get('x-user-email');
    if (userEmail) {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true, email: true, name: true, role: true },
      });
      if (user) {
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'customer',
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting user from request:', error);
    return null;
  }
}

