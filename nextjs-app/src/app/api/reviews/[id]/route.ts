import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { getAuthenticatedUser } from '@/lib/security/auth-middleware';

/**
 * GET /api/reviews/[id]
 * Get a specific review
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      const response = NextResponse.json(
        { error: 'Invalid review ID' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    const review = await prisma.review.findUnique({
      where: { id },
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

    if (!review) {
      const response = NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    const response = NextResponse.json(review);
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Get review error:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch review' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

/**
 * DELETE /api/reviews/[id]
 * Delete a review (admin only or review owner)
 */
export async function DELETE(
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
        { error: 'Invalid review ID' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });

    if (!review) {
      const response = NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    // Check if user is admin or review owner
    const customer = await prisma.customer.findFirst({
      where: { customerEmail: user.email },
      select: { customerId: true },
    });

    const isOwner = customer && customer.customerId === review.customerId;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      const response = NextResponse.json(
        { error: 'Unauthorized: Only review owner or admin can delete' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    await prisma.review.delete({
      where: { id },
    });

    const response = NextResponse.json({
      message: 'Review deleted successfully',
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Delete review error:', error);
    const response = NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

