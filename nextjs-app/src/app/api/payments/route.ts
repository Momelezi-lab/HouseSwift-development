import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { getAuthenticatedUser } from '@/lib/security/auth-middleware';
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log';

/**
 * GET /api/payments
 * Get payments with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const providerId = searchParams.get('providerId');

    const where: any = {};
    if (jobId) {
      where.jobId = parseInt(jobId);
    }
    if (status) {
      where.status = status;
    }
    if (customerId) {
      where.customerId = parseInt(customerId);
    }
    if (providerId) {
      where.providerId = parseInt(providerId);
    }

    const payments = await prisma.payment.findMany({
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

    const response = NextResponse.json(payments);
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Get payments error:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

