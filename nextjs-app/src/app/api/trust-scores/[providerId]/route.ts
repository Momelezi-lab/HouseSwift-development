import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeTrustScore, updateTrustScore } from '@/lib/services/trust-score-service';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { getAuthenticatedUser } from '@/lib/security/auth-middleware';

/**
 * GET /api/trust-scores/[providerId]
 * Get trust score for a provider
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { providerId: string } }
) {
  try {
    const providerId = parseInt(params.providerId);
    
    if (isNaN(providerId)) {
      const response = NextResponse.json(
        { error: 'Invalid provider ID' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Get or compute trust score
    let trustScore = await prisma.trustScore.findUnique({
      where: { providerId },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            serviceType: true,
            rating: true,
          },
        },
      },
    });

    // If trust score doesn't exist, compute and create it
    if (!trustScore) {
      await updateTrustScore(providerId);
      trustScore = await prisma.trustScore.findUnique({
        where: { providerId },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              email: true,
              serviceType: true,
              rating: true,
            },
          },
        },
      });
    }

    if (!trustScore) {
      const response = NextResponse.json(
        { error: 'Trust score not found' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    const response = NextResponse.json({
      providerId: trustScore.providerId,
      trustScore: trustScore.trustScore,
      reliabilityScore: trustScore.reliabilityScore,
      completionRate: trustScore.completionRate,
      cancellationRate: trustScore.cancellationRate,
      averageRating: trustScore.averageRating,
      verificationLevel: trustScore.verificationLevel,
      totalJobs: trustScore.totalJobs,
      completedJobs: trustScore.completedJobs,
      cancelledJobs: trustScore.cancelledJobs,
      totalReviews: trustScore.totalReviews,
      provider: trustScore.provider,
      updatedAt: trustScore.updatedAt,
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Get trust score error:', error);
    const response = NextResponse.json(
      { error: 'Failed to get trust score' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

/**
 * POST /api/trust-scores/[providerId]/recalculate
 * Manually trigger trust score recalculation (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { providerId: string } }
) {
  try {
    // Verify admin access
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'admin') {
      const response = NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    const providerId = parseInt(params.providerId);
    
    if (isNaN(providerId)) {
      const response = NextResponse.json(
        { error: 'Invalid provider ID' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Recalculate trust score
    await updateTrustScore(providerId);

    const trustScore = await prisma.trustScore.findUnique({
      where: { providerId },
    });

    const response = NextResponse.json({
      message: 'Trust score recalculated',
      trustScore: trustScore?.trustScore,
      updatedAt: trustScore?.updatedAt,
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Recalculate trust score error:', error);
    const response = NextResponse.json(
      { error: 'Failed to recalculate trust score' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

