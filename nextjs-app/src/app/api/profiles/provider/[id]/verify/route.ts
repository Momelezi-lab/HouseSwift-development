import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { getAuthenticatedUser, requireRole } from '@/lib/security/auth-middleware';
import { sanitizeString } from '@/lib/security/validation';
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log';
import { updateTrustScore } from '@/lib/services/trust-score-service';

/**
 * POST /api/profiles/provider/[id]/verify
 * Verify provider profile (admin only)
 */
export const POST = requireRole(['admin'], async (
  request: NextRequest,
  user: any,
  { params }: { params: { id: string } }
) => {
  try {
    const providerId = parseInt(params.id);
    
    if (isNaN(providerId)) {
      const response = NextResponse.json(
        { error: 'Invalid provider ID' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    const data = await request.json();
    const { status, notes } = data; // status: 'verified' | 'rejected'

    if (!status || !['verified', 'rejected'].includes(status)) {
      const response = NextResponse.json(
        { error: 'Status must be either "verified" or "rejected"' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Get provider profile
    const profile = await prisma.providerProfile.findUnique({
      where: { providerId },
      include: {
        provider: true,
      },
    });

    if (!profile) {
      const response = NextResponse.json(
        { error: 'Provider profile not found' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    // Update verification status
    const updatedProfile = await prisma.providerProfile.update({
      where: { providerId },
      data: {
        verificationStatus: status,
        verifiedAt: new Date(),
        verifiedBy: user.email,
      },
    });

    // Update trust score if verified (verification level affects trust score)
    if (status === 'verified') {
      try {
        await updateTrustScore(providerId);
      } catch (error) {
        console.error('Failed to update trust score on verification:', error);
        // Don't fail the request if trust score update fails
      }
    }

    // Log audit event
    await logAuditEvent({
      action: 'provider_verification_updated',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      resourceType: 'provider_profile',
      resourceId: profile.id,
      details: {
        providerId: providerId,
        previousStatus: profile.verificationStatus,
        newStatus: status,
        notes: notes || undefined,
      },
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    });

    const response = NextResponse.json({
      message: `Provider profile ${status} successfully`,
      profile: updatedProfile,
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Verify provider profile error:', error);
    const response = NextResponse.json(
      { error: error.message || 'Failed to verify provider profile' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
});

