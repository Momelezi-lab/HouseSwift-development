import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { sanitizeEmail } from '@/lib/security/validation';

/**
 * GET /api/customers
 * Get customers with optional email filter
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    const where: any = {};
    if (email) {
      where.customerEmail = sanitizeEmail(email);
    }

    const customers = await prisma.customer.findMany({
      where,
      select: {
        customerId: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        totalBookings: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const response = NextResponse.json(customers);
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Get customers error:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

