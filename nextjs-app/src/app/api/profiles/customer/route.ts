import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { getAuthenticatedUser } from '@/lib/security/auth-middleware';
import { sanitizeString } from '@/lib/security/validation';
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log';

/**
 * GET /api/profiles/customer
 * Get customer profile for authenticated user
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

    // Get user's customer profile
    const profile = await prisma.customerProfile.findUnique({
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
        address: null,
        city: null,
        postalCode: null,
        preferredContactMethod: null,
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
    console.error('Get customer profile error:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch customer profile' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

/**
 * PUT /api/profiles/customer
 * Create or update customer profile
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

    if (user.role !== 'customer') {
      const response = NextResponse.json(
        { error: 'Only customers can update customer profiles' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    const data = await request.json();
    const { address, city, postalCode, preferredContactMethod } = data;

    // Sanitize inputs
    const sanitizedData: any = {};
    if (address !== undefined) {
      sanitizedData.address = address ? sanitizeString(address) : null;
    }
    if (city !== undefined) {
      sanitizedData.city = city ? sanitizeString(city) : null;
    }
    if (postalCode !== undefined) {
      sanitizedData.postalCode = postalCode ? sanitizeString(postalCode) : null;
    }
    if (preferredContactMethod !== undefined) {
      sanitizedData.preferredContactMethod = preferredContactMethod
        ? sanitizeString(preferredContactMethod)
        : null;
    }

    // Upsert profile
    const profile = await prisma.customerProfile.upsert({
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
      action: 'customer_profile_updated',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      resourceType: 'customer_profile',
      resourceId: profile.id,
      details: {
        updatedFields: Object.keys(sanitizedData),
      },
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    });

    const response = NextResponse.json({
      message: 'Customer profile updated successfully',
      profile,
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Update customer profile error:', error);
    const response = NextResponse.json(
      { error: error.message || 'Failed to update customer profile' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

