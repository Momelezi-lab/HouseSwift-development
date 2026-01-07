import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { onDisputeResolved } from '@/lib/services/trust-score-service';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { sanitizeString, validateEmail } from '@/lib/security/validation';
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log';
import { getAuthenticatedUser } from '@/lib/security/auth-middleware';

/**
 * POST /api/disputes
 * Create a dispute for a service request
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
    let { serviceRequestId, initiatedBy, reason, description } = data;

    // Validate required fields
    if (!serviceRequestId || !initiatedBy || !reason || !description) {
      const response = NextResponse.json(
        { error: 'Service request ID, initiated by, reason, and description are required' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Validate initiatedBy
    if (!['customer', 'provider'].includes(initiatedBy)) {
      const response = NextResponse.json(
        { error: 'initiatedBy must be either "customer" or "provider"' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Sanitize inputs
    serviceRequestId = parseInt(serviceRequestId);
    reason = sanitizeString(reason);
    description = sanitizeString(description);

    if (isNaN(serviceRequestId)) {
      const response = NextResponse.json(
        { error: 'Invalid service request ID' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Verify service request exists
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { requestId: serviceRequestId },
      include: {
        customer: true,
        provider: true,
      },
    });

    if (!serviceRequest) {
      const response = NextResponse.json(
        { error: 'Service request not found' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    // Verify user has permission to create dispute
    if (initiatedBy === 'customer') {
      if (serviceRequest.customerEmail !== user.email) {
        const response = NextResponse.json(
          { error: 'Unauthorized: You can only create disputes for your own requests' },
          { status: 403 }
        );
        return addSecurityHeaders(response);
      }
    } else if (initiatedBy === 'provider') {
      if (serviceRequest.providerEmail !== user.email) {
        const response = NextResponse.json(
          { error: 'Unauthorized: You can only create disputes for your assigned requests' },
          { status: 403 }
        );
        return addSecurityHeaders(response);
      }
    }

    // Check if dispute already exists for this request
    const existingDispute = await prisma.dispute.findFirst({
      where: {
        jobId: serviceRequestId, // Note: schema uses jobId
        status: { in: ['pending', 'in_review'] },
      },
    });

    if (existingDispute) {
      const response = NextResponse.json(
        { error: 'An active dispute already exists for this service request' },
        { status: 409 }
      );
      return addSecurityHeaders(response);
    }

    // Create dispute
    const dispute = await prisma.dispute.create({
      data: {
        jobId: serviceRequestId, // Note: schema uses jobId, which maps to ServiceRequest.requestId
        customerId: serviceRequest.customerId,
        providerId: serviceRequest.assignedProviderId || 0,
        initiatedBy: initiatedBy,
        reason: reason,
        description: description,
        status: 'pending',
      },
      include: {
        serviceRequest: {
          select: {
            requestId: true,
            customerName: true,
            providerName: true,
          },
        },
      },
    });

    // Log audit event
    await logAuditEvent({
      action: 'dispute_created',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      resourceType: 'dispute',
      resourceId: dispute.id,
      details: {
        serviceRequestId: serviceRequestId,
        initiatedBy: initiatedBy,
        reason: reason,
      },
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    });

    const response = NextResponse.json({
      message: 'Dispute created successfully',
      dispute: {
        id: dispute.id,
        jobId: dispute.jobId,
        status: dispute.status,
        createdAt: dispute.createdAt,
      },
    }, { status: 201 });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Create dispute error:', error);
    const response = NextResponse.json(
      { error: error.message || 'Failed to create dispute' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

/**
 * GET /api/disputes
 * Get disputes with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const serviceRequestId = searchParams.get('serviceRequestId');
    const status = searchParams.get('status');
    const initiatedBy = searchParams.get('initiatedBy');

    const where: any = {};
    if (serviceRequestId) {
      where.jobId = parseInt(serviceRequestId); // Note: schema uses jobId
    }
    if (status) {
      where.status = status;
    }
    if (initiatedBy) {
      where.initiatedBy = initiatedBy;
    }

    const disputes = await prisma.dispute.findMany({
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

    // Fetch service requests separately since there's no relation
    const disputesWithServiceRequests = await Promise.all(
      disputes.map(async (dispute) => {
        const serviceRequest = await prisma.serviceRequest.findUnique({
          where: { requestId: dispute.jobId },
          select: {
            requestId: true,
            customerName: true,
            providerName: true,
            status: true,
          },
        });
        return {
          ...dispute,
          serviceRequest: serviceRequest || null,
        };
      })
    );

    const response = NextResponse.json(disputesWithServiceRequests);
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Get disputes error:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch disputes' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

