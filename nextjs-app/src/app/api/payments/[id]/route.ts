import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { addSecurityHeaders } from '@/lib/security/security-headers'
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log'
import { getAuthenticatedUser } from '@/lib/security/auth-middleware'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = parseInt(params.id)
    const formData = await request.formData()

    // Get payment details
    const paymentMethod = formData.get('paymentMethod') as string
    const depositAmount = formData.get('depositAmount') as string
    const proofFile = formData.get('proofOfPayment') as File | null

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify service request exists
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { requestId },
    })

    if (!serviceRequest) {
      return NextResponse.json(
        { error: 'Service request not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Handle file upload for EFT proof of payment
    let proofOfPaymentPath: string | null = null
    if (paymentMethod === 'eft' && proofFile) {
      try {
        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'payments')
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true })
        }

        // Generate unique filename
        const timestamp = Date.now()
        const sanitizedName = proofFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filename = `${requestId}_${timestamp}_${sanitizedName}`
        const filePath = join(uploadsDir, filename)

        // Convert file to buffer and save
        const bytes = await proofFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filePath, buffer)

        // Store relative path for web access
        proofOfPaymentPath = `/uploads/payments/${filename}`
      } catch (fileError: any) {
        console.error('File upload error:', fileError)
        return NextResponse.json(
          { error: 'Failed to upload proof of payment: ' + fileError.message },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    // Update service request with payment information
    const updateData: any = {
      paymentMethod,
      customerPaymentReceived: paymentMethod === 'credit_card', // Credit card payments are auto-confirmed
    }

    // Store proof of payment path in service request notes
    if (proofOfPaymentPath) {
      const existingNotes = serviceRequest.adminNotes || ''
      updateData.adminNotes = existingNotes
        ? `${existingNotes}\n[EFT Payment Proof]: ${proofOfPaymentPath}`
        : `[EFT Payment Proof]: ${proofOfPaymentPath}`
    }

    // Create Payment record in escrow system
    const payment = await prisma.payment.create({
      data: {
        jobId: requestId,
        customerId: serviceRequest.customerId,
        providerId: serviceRequest.assignedProviderId || null,
        amount: serviceRequest.totalCustomerPaid,
        providerPayout: serviceRequest.totalProviderPayout,
        commission: serviceRequest.totalCommissionEarned,
        paymentMethod: paymentMethod,
        status: paymentMethod === 'credit_card' ? 'in_escrow' : 'pending', // Credit card auto-verified
        customerPaidAt: paymentMethod === 'credit_card' ? new Date() : null,
        proofOfPaymentUrl: proofOfPaymentPath,
      },
    });

    // Update service request
    updateData.customerPaymentReceived = paymentMethod === 'credit_card';
    const updated = await prisma.serviceRequest.update({
      where: { requestId },
      data: updateData,
    });

    // Log audit event
    const user = await getAuthenticatedUser(request);
    if (user) {
      await logAuditEvent({
        action: 'payment_submitted',
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        resourceType: 'payment',
        resourceId: payment.id,
        details: {
          jobId: requestId,
          amount: payment.amount,
          paymentMethod: paymentMethod,
          status: payment.status,
        },
        timestamp: new Date(),
        ipAddress: getClientIp(request),
      });
    }

    const response = NextResponse.json(
      {
        message: 'Payment submitted successfully',
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
        },
        request: {
          requestId: updated.requestId,
          paymentMethod: updated.paymentMethod,
          customerPaymentReceived: updated.customerPaymentReceived,
          status: updated.status,
        },
      },
      { status: 200, headers: corsHeaders }
    );
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Payment submission error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit payment' },
      { status: 500, headers: corsHeaders }
    )
  }
}

