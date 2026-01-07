import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { getAuthenticatedUser } from '@/lib/security/auth-middleware';

/**
 * GET /api/audit-logs
 * Admin endpoint to retrieve audit logs with filters
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const resourceType = searchParams.get('resourceType');
    const resourceId = searchParams.get('resourceId');
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (userId) where.userId = parseInt(userId);
    if (resourceType) where.resourceType = resourceType;
    if (resourceId) where.resourceId = parseInt(resourceId);
    if (action) where.action = action;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.auditLog.count({ where });

    const response = NextResponse.json({
      logs,
      total,
      limit,
      offset,
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Get audit logs error:', error);
    const response = NextResponse.json(
      { error: error.message || 'Failed to fetch audit logs' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}


