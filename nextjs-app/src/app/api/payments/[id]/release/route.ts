import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { getAuthenticatedUser, requireRole } from '@/lib/security/auth-middleware';
import { validateTransition } from '@/lib/services/payment-state-machine';
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log';

/**
 * POST /api/payments/[id]/release
 * Release payment from escrow to provider (admin or auto on job completion)
 */
export const POST = requireRole(['admin'], async (
  request: NextRequest,
  user: any,
  { params }: { params: { id: string } }
) => {
  try {
    const paymentId = parseInt(params.id);
    
    if (isNaN(paymentId)) {
      const response = NextResponse.json(
        { error: 'Invalid payment ID' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Get payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        customer: true,
        provider: true,
      },
    });

    if (!payment) {
      const response = NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    // Validate transition
    const transition = validateTransition(
      payment.status as any,
      'released',
      user.role === 'admin'
    );

    if (!transition.valid) {
      const response = NextResponse.json(
        { error: transition.error },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'released',
        releasedAt: new Date(),
        releasedBy: user.email,
      },
    });

    // Update service request
    await prisma.serviceRequest.update({
      where: { requestId: payment.jobId },
      data: {
        providerPaymentMade: true,
      },
    });

    // Log audit event
    await logAuditEvent({
      action: 'payment_released',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      resourceType: 'payment',
      resourceId: paymentId,
      details: {
        jobId: payment.jobId,
        amount: payment.amount,
        providerPayout: payment.providerPayout,
        commission: payment.commission,
      },
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    });

    const response = NextResponse.json({
      message: 'Payment released successfully',
      payment: updatedPayment,
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Release payment error:', error);
    const response = NextResponse.json(
      { error: error.message || 'Failed to release payment' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
});

/**
 * Auto-release payment (called by system, no auth required)
 * Used when job is completed
 * Note: This is exported separately to avoid Next.js route handler issues
 */
export async function autoReleasePayment(paymentId: number): Promise<void> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.status !== 'in_escrow') {
      return; // Can't auto-release if not in escrow
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'released',
        releasedAt: new Date(),
        releasedBy: 'system',
      },
    });

    await prisma.serviceRequest.update({
      where: { requestId: payment.jobId },
      data: {
        providerPaymentMade: true,
      },
    });
  } catch (error) {
    console.error('Auto-release payment error:', error);
    throw error;
  }
}

