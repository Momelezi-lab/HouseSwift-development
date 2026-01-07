import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { onDisputeResolved } from '@/lib/services/trust-score-service';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { sanitizeString } from '@/lib/security/validation';
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log';
import { getAuthenticatedUser, requireRole } from '@/lib/security/auth-middleware';

/**
 * GET /api/disputes/[id]
 * Get a specific dispute
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      const response = NextResponse.json(
        { error: 'Invalid dispute ID' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      // Note: Fetch service request separately since there's no relation
        customer: {
          select: {
            customerName: true,
            customerEmail: true,
            customerPhone: true,
          },
        },
        provider: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!dispute) {
      const response = NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    // Fetch service request separately
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { requestId: dispute.jobId },
      select: {
        requestId: true,
        customerName: true,
        providerName: true,
        status: true,
        totalCustomerPaid: true,
      },
    });

    const response = NextResponse.json({
      ...dispute,
      serviceRequest: serviceRequest || null,
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Get dispute error:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch dispute' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

/**
 * PATCH /api/disputes/[id]
 * Update dispute status (admin only for resolution)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      const response = NextResponse.json(
        { error: 'Invalid dispute ID' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    const data = await request.json();
    const { status, resolution } = data;

    // Get current dispute
    const dispute = await prisma.dispute.findUnique({
      where: { id },
    });

    if (!dispute) {
      const response = NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    // Only admins can resolve disputes
    if (status === 'resolved' || status === 'dismissed') {
      if (user.role !== 'admin') {
        const response = NextResponse.json(
          { error: 'Unauthorized: Only admins can resolve disputes' },
          { status: 403 }
        );
        return addSecurityHeaders(response);
      }
    }

    // Update dispute
    const updateData: any = {};
    if (status) {
      updateData.status = status;
    }
    if (resolution !== undefined) {
      updateData.resolution = sanitizeString(resolution);
    }
    if (status === 'resolved' || status === 'dismissed') {
      updateData.resolvedAt = new Date();
    }

    const updatedDispute = await prisma.dispute.update({
      where: { id },
      data: updateData,
    });

    // If dispute is resolved, update trust score
    if (status === 'resolved' && dispute.status !== 'resolved') {
      try {
        await onDisputeResolved(id);
      } catch (error) {
        console.error('Failed to update trust score on dispute resolution:', error);
        // Don't fail the request if trust score update fails
      }
    }

    // Log audit event
    await logAuditEvent({
      action: 'dispute_updated',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      resourceType: 'dispute',
      resourceId: id,
      details: {
        oldStatus: dispute.status,
        newStatus: status || dispute.status,
        resolution: resolution || undefined,
      },
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    });

    // Fetch service request separately
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { requestId: updatedDispute.jobId },
      select: {
        requestId: true,
        customerName: true,
        providerName: true,
        status: true,
      },
    });

    const response = NextResponse.json({
      message: 'Dispute updated successfully',
      dispute: {
        ...updatedDispute,
        serviceRequest: serviceRequest || null,
      },
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Update dispute error:', error);
    const response = NextResponse.json(
      { error: error.message || 'Failed to update dispute' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

