import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { getAuthenticatedUser, requireRole } from '@/lib/security/auth-middleware';
import { validateTransition } from '@/lib/services/payment-state-machine';
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log';

/**
 * POST /api/payments/[id]/verify
 * Verify EFT payment and move to escrow (admin only)
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
      'in_escrow',
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
        status: 'in_escrow',
        customerPaidAt: new Date(),
      },
    });

    // Update service request
    await prisma.serviceRequest.update({
      where: { requestId: payment.jobId },
      data: {
        customerPaymentReceived: true,
      },
    });

    // Log audit event
    await logAuditEvent({
      action: 'payment_verified',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      resourceType: 'payment',
      resourceId: paymentId,
      details: {
        jobId: payment.jobId,
        amount: payment.amount,
        previousStatus: payment.status,
        newStatus: 'in_escrow',
      },
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    });

    const response = NextResponse.json({
      message: 'Payment verified and moved to escrow',
      payment: updatedPayment,
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Verify payment error:', error);
    const response = NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
});

