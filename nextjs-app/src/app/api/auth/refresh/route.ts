import { NextRequest, NextResponse } from 'next/server';
import {
  getRefreshTokenCookie,
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '@/lib/security/jwt';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token from httpOnly cookie
 * Implements token rotation for security
 */
export async function POST(request: NextRequest) {
  try {
    // Get refresh token from httpOnly cookie
    const refreshToken = await getRefreshTokenCookie();

    if (!refreshToken) {
      const response = NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      // Invalid refresh token - clear cookie
      await clearRefreshTokenCookie();
      const response = NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) {
      await clearRefreshTokenCookie();
      const response = NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Token rotation: Generate new access and refresh tokens
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'customer',
      name: user.name,
    });

    const newRefreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'customer',
      name: user.name,
    });

    // Set new refresh token in httpOnly cookie
    await setRefreshTokenCookie(newRefreshToken);

    // Log token refresh
    await logAuditEvent({
      action: 'token_refreshed',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role || 'customer',
      resourceType: 'auth',
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    });

    const response = NextResponse.json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'customer',
      },
    });

    addSecurityHeaders(response);
    return response;
  } catch (error: any) {
    console.error('Token refresh error:', error);
    const response = NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

