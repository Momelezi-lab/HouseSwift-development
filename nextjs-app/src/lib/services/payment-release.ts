import { prisma } from '@/lib/prisma';

/**
 * Auto-release payment (called by system)
 * Used when job is completed
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

