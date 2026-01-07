import { NextRequest, NextResponse } from 'next/server';
import { clearRefreshTokenCookie } from '@/lib/security/jwt';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log';
import { getTokenFromHeader, verifyToken } from '@/lib/security/jwt';

/**
 * POST /api/auth/logout
 * Logout user by clearing refresh token cookie
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from access token for audit logging
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);
    let userId: number | undefined;
    let userEmail: string | undefined;
    let userRole: string | undefined;

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        userId = payload.userId;
        userEmail = payload.email;
        userRole = payload.role;
      }
    }

    // Clear refresh token cookie
    await clearRefreshTokenCookie();

    // Log logout
    if (userId) {
      await logAuditEvent({
        action: 'logout',
        userId,
        userEmail,
        userRole,
        resourceType: 'auth',
        timestamp: new Date(),
        ipAddress: getClientIp(request),
      });
    }

    const response = NextResponse.json({
      message: 'Logout successful',
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Logout error:', error);
    const response = NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

