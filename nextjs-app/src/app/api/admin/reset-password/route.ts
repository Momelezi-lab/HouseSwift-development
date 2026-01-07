import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { getAuthenticatedUser } from '@/lib/security/auth-middleware';
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log';
import bcrypt from 'bcryptjs';

/**
 * POST /api/admin/reset-password
 * Admin endpoint to reset any user's password
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      const response = NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Verify user is admin
    if (user.role !== 'admin') {
      const response = NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    const data = await request.json();
    const { userId, newPassword } = data;

    if (!userId || !newPassword) {
      const response = NextResponse.json(
        { error: 'User ID and new password are required' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Validate password strength (minimum 6 characters)
    if (newPassword.length < 6) {
      const response = NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Find the user to reset
    const targetUser = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!targetUser) {
      const response = NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    // Hash the new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update user's password
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { passwordHash },
    });

    // Log audit event
    await logAuditEvent({
      action: 'admin_password_reset',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      resourceType: 'user',
      resourceId: parseInt(userId),
      details: {
        targetUserId: parseInt(userId),
        targetUserEmail: targetUser.email,
        targetUserRole: targetUser.role,
        targetUserName: targetUser.name,
        resetBy: user.email,
      },
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    });

    const response = NextResponse.json({
      message: 'Password reset successfully',
      userId: parseInt(userId),
      userEmail: targetUser.email,
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Admin password reset error:', error);
    const response = NextResponse.json(
      { error: error.message || 'Failed to reset password' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}


