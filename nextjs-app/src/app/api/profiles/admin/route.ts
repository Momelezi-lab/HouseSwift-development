import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { getAuthenticatedUser } from '@/lib/security/auth-middleware';
import { sanitizeString } from '@/lib/security/validation';
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log';

/**
 * GET /api/profiles/admin
 * Get admin profile for authenticated user
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

    if (user.role !== 'admin') {
      const response = NextResponse.json(
        { error: 'Only admins can access admin profiles' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    // Get admin profile
    const profile = await prisma.adminProfile.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    if (!profile) {
      // Return empty profile if doesn't exist
      const response = NextResponse.json({
        userId: user.id,
        department: null,
        permissions: null,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
      return addSecurityHeaders(response);
    }

    const response = NextResponse.json(profile);
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Get admin profile error:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch admin profile' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

/**
 * PUT /api/profiles/admin
 * Create or update admin profile (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      const response = NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    if (user.role !== 'admin') {
      const response = NextResponse.json(
        { error: 'Only admins can update admin profiles' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    const data = await request.json();
    const { department, permissions } = data;

    // Sanitize inputs
    const sanitizedData: any = {};
    if (department !== undefined) {
      sanitizedData.department = department ? sanitizeString(department) : null;
    }
    if (permissions !== undefined) {
      // Permissions is a JSON array, validate it
      try {
        const permsArray = Array.isArray(permissions) ? permissions : JSON.parse(permissions);
        sanitizedData.permissions = JSON.stringify(permsArray);
      } catch {
        sanitizedData.permissions = null;
      }
    }

    // Upsert profile
    const profile = await prisma.adminProfile.upsert({
      where: { userId: user.id },
      update: sanitizedData,
      create: {
        userId: user.id,
        ...sanitizedData,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    // Log audit event
    await logAuditEvent({
      action: 'admin_profile_updated',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      resourceType: 'admin_profile',
      resourceId: profile.id,
      details: {
        updatedFields: Object.keys(sanitizedData),
      },
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    });

    const response = NextResponse.json({
      message: 'Admin profile updated successfully',
      profile,
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Update admin profile error:', error);
    const response = NextResponse.json(
      { error: error.message || 'Failed to update admin profile' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

