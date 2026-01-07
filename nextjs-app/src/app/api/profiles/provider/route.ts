import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { getAuthenticatedUser, requireRole } from '@/lib/security/auth-middleware';
import { sanitizeString } from '@/lib/security/validation';
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log';

/**
 * GET /api/profiles/provider
 * Get provider profile for authenticated user
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

    // Get provider by email
    const provider = await prisma.serviceProvider.findFirst({
      where: { email: user.email },
    });

    if (!provider) {
      const response = NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    // Get provider profile
    const profile = await prisma.providerProfile.findUnique({
      where: { providerId: provider.id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            serviceType: true,
            rating: true,
          },
        },
      },
    });

    if (!profile) {
      // Return empty profile if doesn't exist
      const response = NextResponse.json({
        providerId: provider.id,
        bankName: null,
        bankAccountNumber: null,
        bankAccountType: null,
        idNumber: null,
        taxNumber: null,
        businessRegistration: null,
        verificationStatus: 'pending',
        verifiedAt: null,
        verifiedBy: null,
        provider: {
          id: provider.id,
          name: provider.name,
          email: provider.email,
          phone: provider.phone,
          serviceType: provider.serviceType,
          rating: provider.rating,
        },
      });
      return addSecurityHeaders(response);
    }

    const response = NextResponse.json(profile);
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Get provider profile error:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch provider profile' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

/**
 * PUT /api/profiles/provider
 * Create or update provider profile (provider only)
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

    if (user.role !== 'provider') {
      const response = NextResponse.json(
        { error: 'Only providers can update provider profiles' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    // Get provider by email
    const provider = await prisma.serviceProvider.findFirst({
      where: { email: user.email },
    });

    if (!provider) {
      const response = NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    const data = await request.json();
    const {
      bankName,
      bankAccountNumber,
      bankAccountType,
      idNumber,
      taxNumber,
      businessRegistration,
    } = data;

    // Sanitize inputs
    const sanitizedData: any = {};
    if (bankName !== undefined) {
      sanitizedData.bankName = bankName ? sanitizeString(bankName) : null;
    }
    if (bankAccountNumber !== undefined) {
      sanitizedData.bankAccountNumber = bankAccountNumber
        ? sanitizeString(bankAccountNumber)
        : null;
    }
    if (bankAccountType !== undefined) {
      sanitizedData.bankAccountType = bankAccountType
        ? sanitizeString(bankAccountType)
        : null;
    }
    if (idNumber !== undefined) {
      sanitizedData.idNumber = idNumber ? sanitizeString(idNumber) : null;
    }
    if (taxNumber !== undefined) {
      sanitizedData.taxNumber = taxNumber ? sanitizeString(taxNumber) : null;
    }
    if (businessRegistration !== undefined) {
      sanitizedData.businessRegistration = businessRegistration
        ? sanitizeString(businessRegistration)
        : null;
    }

    // Reset verification status when profile is updated (admin needs to re-verify)
    sanitizedData.verificationStatus = 'pending';
    sanitizedData.verifiedAt = null;
    sanitizedData.verifiedBy = null;

    // Upsert profile
    const profile = await prisma.providerProfile.upsert({
      where: { providerId: provider.id },
      update: sanitizedData,
      create: {
        providerId: provider.id,
        ...sanitizedData,
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            serviceType: true,
            rating: true,
          },
        },
      },
    });

    // Log audit event
    await logAuditEvent({
      action: 'provider_profile_updated',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      resourceType: 'provider_profile',
      resourceId: profile.id,
      details: {
        providerId: provider.id,
        updatedFields: Object.keys(sanitizedData),
      },
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    });

    const response = NextResponse.json({
      message: 'Provider profile updated successfully',
      profile,
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Update provider profile error:', error);
    const response = NextResponse.json(
      { error: error.message || 'Failed to update provider profile' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

