import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { getAuthenticatedUser } from '@/lib/security/auth-middleware';
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log';
import { autoReleasePayment } from '@/lib/services/payment-release';
import { onJobCompleted } from '@/lib/services/trust-score-service';

/**
 * POST /api/service-requests/[id]/confirm-completion
 * Confirm job completion (customer or provider)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      const response = NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    const requestId = parseInt(params.id);
    if (isNaN(requestId)) {
      const response = NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Get service request
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { requestId },
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

    // Verify user has permission
    const isCustomer = serviceRequest.customerEmail === user.email;
    const isProvider = serviceRequest.providerEmail === user.email;

    if (!isCustomer && !isProvider) {
      const response = NextResponse.json(
        { error: 'Unauthorized: You can only confirm your own jobs' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    // Determine which confirmation to update
    const updateData: any = {};
    let confirmedBy = '';
    
    if (isCustomer) {
      // Check if already confirmed
      if (serviceRequest.customerConfirmedCompletion) {
        const response = NextResponse.json(
          { error: 'You have already confirmed completion for this job' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }
      updateData.customerConfirmedCompletion = true;
      confirmedBy = 'customer';
    } else if (isProvider) {
      // Check if already confirmed
      if (serviceRequest.providerConfirmedCompletion) {
        const response = NextResponse.json(
          { error: 'You have already confirmed completion for this job' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }
      updateData.providerConfirmedCompletion = true;
      confirmedBy = 'provider';
    }

    // Update service request
    const updated = await prisma.serviceRequest.update({
      where: { requestId },
      data: updateData,
    });

    // Check if both parties have confirmed
    const bothConfirmed = 
      updated.customerConfirmedCompletion && 
      updated.providerConfirmedCompletion;
    
    // Check if at least one party has confirmed (allows rating)
    const oneConfirmed = 
      updated.customerConfirmedCompletion || 
      updated.providerConfirmedCompletion;

    // If both confirmed and status is not completed, update status to completed
    if (bothConfirmed && updated.status !== 'completed') {
      await prisma.serviceRequest.update({
        where: { requestId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      // Auto-release payment
      try {
        const payment = await prisma.payment.findFirst({
          where: {
            jobId: requestId,
            status: 'in_escrow',
          },
        });
        if (payment) {
          await autoReleasePayment(payment.id);
        }
      } catch (error) {
        console.error('Failed to auto-release payment on completion:', error);
      }

      // Update trust score
      try {
        if (serviceRequest.assignedProviderId) {
          await onJobCompleted(requestId);
        }
      } catch (error) {
        console.error('Failed to update trust score on completion:', error);
      }
    }

    // Log audit event
    await logAuditEvent({
      action: 'completion_confirmed',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      resourceType: 'service_request',
      resourceId: requestId,
      details: {
        confirmedBy,
        bothConfirmed,
        status: bothConfirmed ? 'completed' : updated.status,
      },
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    });

    const response = NextResponse.json({
      message: 'Completion confirmed successfully',
      bothConfirmed,
      oneConfirmed, // At least one party confirmed (allows rating)
      status: bothConfirmed ? 'completed' : updated.status,
      canRate: oneConfirmed, // Both parties can now rate each other
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Confirm completion error:', error);
    const response = NextResponse.json(
      { error: error.message || 'Failed to confirm completion' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

