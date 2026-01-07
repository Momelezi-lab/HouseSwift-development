import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { onReviewSubmitted } from '@/lib/services/trust-score-service';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { sanitizeString, sanitizeNumber, validateQuantity } from '@/lib/security/validation';
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log';
import { getAuthenticatedUser } from '@/lib/security/auth-middleware';

/**
 * POST /api/reviews
 * Create a review for a completed job
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      const response = NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    const data = await request.json();
    let { jobId, providerId, customerId, rating, comment, reliabilityScore, qualityScore, communicationScore, reviewedBy } = data;

    // Validate required fields
    if (!jobId || !rating || !reviewedBy) {
      const response = NextResponse.json(
        { error: 'Job ID, rating, and reviewedBy (customer/provider) are required' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Validate reviewedBy
    if (!['customer', 'provider'].includes(reviewedBy)) {
      const response = NextResponse.json(
        { error: 'reviewedBy must be either "customer" or "provider"' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Sanitize inputs
    jobId = sanitizeNumber(jobId);
    rating = sanitizeNumber(rating);
    comment = comment ? sanitizeString(comment) : undefined;
    reliabilityScore = reliabilityScore ? sanitizeNumber(reliabilityScore) : undefined;
    qualityScore = qualityScore ? sanitizeNumber(qualityScore) : undefined;
    communicationScore = communicationScore ? sanitizeNumber(communicationScore) : undefined;

    // Validate rating (1-5)
    if (rating < 1 || rating > 5) {
      const response = NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Validate optional scores (0-100)
    if (reliabilityScore && (reliabilityScore < 0 || reliabilityScore > 100)) {
      const response = NextResponse.json(
        { error: 'Reliability score must be between 0 and 100' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    if (qualityScore && (qualityScore < 0 || qualityScore > 100)) {
      const response = NextResponse.json(
        { error: 'Quality score must be between 0 and 100' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    if (communicationScore && (communicationScore < 0 || communicationScore > 100)) {
      const response = NextResponse.json(
        { error: 'Communication score must be between 0 and 100' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Verify job exists
    const job = await prisma.serviceRequest.findUnique({
      where: { requestId: jobId },
      select: {
        requestId: true,
        customerId: true,
        customerEmail: true,
        providerEmail: true,
        status: true,
        assignedProviderId: true,
        customerConfirmedCompletion: true,
        providerConfirmedCompletion: true,
      },
    });

    if (!job) {
      const response = NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    // Check if at least one party has confirmed completion (required for rating)
    const oneConfirmed = job.customerConfirmedCompletion || job.providerConfirmedCompletion;
    if (!oneConfirmed && job.status !== 'completed') {
      const response = NextResponse.json(
        { error: 'Cannot review a job until at least one party has confirmed completion' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Verify user has permission to review
    let finalCustomerId = 0;
    let finalProviderId = 0;
    let finalReviewedUserId = 0;

    if (reviewedBy === 'customer') {
      // Customer is reviewing provider
      if (job.customerEmail !== user.email) {
        const response = NextResponse.json(
          { error: 'Unauthorized: Only the customer can submit customer reviews' },
          { status: 403 }
        );
        return addSecurityHeaders(response);
      }
      if (!job.assignedProviderId || !job.customerId) {
        const response = NextResponse.json(
          { error: 'Invalid job: Missing customer or provider information' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }
      finalCustomerId = job.customerId;
      finalProviderId = job.assignedProviderId;
      finalReviewedUserId = job.assignedProviderId; // Provider is being reviewed
    } else if (reviewedBy === 'provider') {
      // Provider is reviewing customer
      if (job.providerEmail !== user.email) {
        const response = NextResponse.json(
          { error: 'Unauthorized: Only the assigned provider can submit provider reviews' },
          { status: 403 }
        );
        return addSecurityHeaders(response);
      }
      if (!job.assignedProviderId || !job.customerId) {
        const response = NextResponse.json(
          { error: 'Invalid job: Missing customer or provider information' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }
      // Get provider ID from user email
      const provider = await prisma.serviceProvider.findFirst({
        where: { email: user.email },
        select: { id: true },
      });
      if (!provider) {
        const response = NextResponse.json(
          { error: 'Provider profile not found' },
          { status: 404 }
        );
        return addSecurityHeaders(response);
      }
      finalCustomerId = job.customerId;
      finalProviderId = provider.id;
      finalReviewedUserId = job.customerId; // Customer is being reviewed
    }

    // Check if review already exists for this reviewer
    const existingReview = await prisma.review.findFirst({
      where: {
        jobId: jobId,
        reviewedBy: reviewedBy,
      },
    });

    if (existingReview) {
      const response = NextResponse.json(
        { error: `You have already submitted a review as ${reviewedBy}` },
        { status: 409 }
      );
      return addSecurityHeaders(response);
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        jobId: jobId,
        customerId: finalCustomerId,
        providerId: finalProviderId,
        reviewedBy: reviewedBy,
        reviewedUserId: finalReviewedUserId,
        rating: rating,
        comment: comment,
        reliabilityScore: reliabilityScore,
        qualityScore: qualityScore,
        communicationScore: communicationScore,
        isVerified: true, // Auto-verify for now
      },
      include: {
        customer: {
          select: {
            customerName: true,
            customerEmail: true,
          },
        },
        provider: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Update trust score
    try {
      await onReviewSubmitted(review.id);
    } catch (error) {
      console.error('Failed to update trust score on review submission:', error);
      // Don't fail the request if trust score update fails
    }

    // Log audit event
    await logAuditEvent({
      action: 'review_submitted',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      resourceType: 'review',
      resourceId: review.id,
      details: {
        jobId: jobId,
        providerId: providerId,
        rating: rating,
      },
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    });

    const response = NextResponse.json({
      message: 'Review submitted successfully',
      review: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      },
    }, { status: 201 });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Create review error:', error);
    const response = NextResponse.json(
      { error: error.message || 'Failed to create review' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

/**
 * GET /api/reviews
 * Get reviews with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get('providerId');
    const jobId = searchParams.get('jobId');
    const customerId = searchParams.get('customerId');

    const where: any = {};
    if (providerId) {
      where.providerId = parseInt(providerId);
    }
    if (jobId) {
      where.jobId = parseInt(jobId);
    }
    if (customerId) {
      where.customerId = parseInt(customerId);
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        customer: {
          select: {
            customerName: true,
            customerEmail: true,
          },
        },
        provider: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const response = NextResponse.json(reviews);
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Get reviews error:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

