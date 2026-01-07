import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { getAuthenticatedUser, requireRole } from '@/lib/security/auth-middleware';
import { validateTransition } from '@/lib/services/payment-state-machine';
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log';
import { sanitizeString } from '@/lib/security/validation';

/**
 * POST /api/payments/[id]/refund
 * Refund payment to customer (admin only)
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

    const data = await request.json();
    const { reason } = data;

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
      'refunded',
      true // Admin required
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
        status: 'refunded',
        releasedAt: new Date(),
        releasedBy: user.email,
      },
    });

    // Update service request
    await prisma.serviceRequest.update({
      where: { requestId: payment.jobId },
      data: {
        status: 'cancelled',
        adminNotes: reason
          ? `${payment.adminNotes || ''}\n[Refund Reason]: ${sanitizeString(reason)}`.trim()
          : payment.adminNotes,
      },
    });

    // Log audit event
    await logAuditEvent({
      action: 'payment_refunded',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      resourceType: 'payment',
      resourceId: paymentId,
      details: {
        jobId: payment.jobId,
        amount: payment.amount,
        reason: reason || 'No reason provided',
      },
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    });

    const response = NextResponse.json({
      message: 'Payment refunded successfully',
      payment: updatedPayment,
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Refund payment error:', error);
    const response = NextResponse.json(
      { error: error.message || 'Failed to refund payment' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
});

