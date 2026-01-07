import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateEmailTemplates } from '@/lib/email'
import { sanitizeEmail, sanitizeNumber, validateEmail } from '@/lib/security/validation'
import { addSecurityHeaders } from '@/lib/security/security-headers'
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log'

/**
 * POST /api/service-requests/[id]/assign-provider
 * Admin endpoint to assign a provider to a booking
 * This confirms the assignment and removes booking from other providers' dashboards
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      const response = NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      )
      return addSecurityHeaders(response)
    }

    const data = await request.json()
    let { providerId, adminEmail } = data

    // Sanitize inputs
    adminEmail = sanitizeEmail(adminEmail)
    providerId = sanitizeNumber(providerId)

    if (!providerId || providerId <= 0) {
      const response = NextResponse.json(
        { error: 'Valid provider ID is required' },
        { status: 400 }
      )
      return addSecurityHeaders(response)
    }

    if (!adminEmail || !validateEmail(adminEmail)) {
      const response = NextResponse.json(
        { error: 'Valid admin email is required for audit trail' },
        { status: 400 }
      )
      return addSecurityHeaders(response)
    }

    // Verify admin user exists and has admin role
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true, role: true },
    })

    if (!adminUser || adminUser.role !== 'admin') {
      const response = NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
      return addSecurityHeaders(response)
    }

    // Get the service request
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { requestId: id },
    })

    if (!serviceRequest) {
      return NextResponse.json(
        { error: 'Service request not found' },
        { status: 404 }
      )
    }

    // Check if already assigned
    if (serviceRequest.assignedProviderId) {
      return NextResponse.json(
        { 
          error: 'This booking has already been assigned to a provider',
          alreadyAssigned: true,
          currentProviderId: serviceRequest.assignedProviderId
        },
        { status: 409 }
      )
    }

    // Get provider details
    const provider = await prisma.serviceProvider.findUnique({
      where: { id: providerId },
    })

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    // Parse interested providers to get all providers who showed interest
    let interestedProviders: any[] = []
    if (serviceRequest.interestedProviders) {
      try {
        interestedProviders = JSON.parse(serviceRequest.interestedProviders)
      } catch {
        interestedProviders = []
      }
    }

    // Get all provider IDs who showed interest (for notifications)
    const allInterestedProviderIds = interestedProviders.map((p: any) => p.providerId)

    // Update audit log
    let auditLog: any[] = []
    if (serviceRequest.auditLog) {
      try {
        auditLog = JSON.parse(serviceRequest.auditLog)
      } catch {
        auditLog = []
      }
    }

    auditLog.push({
      action: 'provider_assigned',
      assignedBy: adminEmail,
      providerId: providerId,
      providerName: provider.name,
      timestamp: new Date().toISOString(),
      details: `Admin ${adminEmail} assigned provider ${provider.name} to booking`,
    })

    // Log audit event
    await logAuditEvent({
      action: 'provider_assigned',
      userId: adminUser.id,
      userEmail: adminEmail,
      userRole: 'admin',
      resourceType: 'service_request',
      resourceId: id,
      details: {
        providerId: providerId,
        providerName: provider.name,
        providerEmail: provider.email,
      },
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    })

    // Update the service request - assign provider and change status to ASSIGNED
    const updated = await prisma.serviceRequest.update({
      where: { requestId: id },
      data: {
        assignedProviderId: providerId,
        providerName: provider.name,
        providerPhone: provider.phone,
        providerEmail: provider.email,
        status: 'assigned',
        assignedAt: new Date(),
        assignedBy: adminEmail,
        auditLog: JSON.stringify(auditLog),
      },
      include: {
        customer: true,
        provider: true,
      },
    })

    // Send notifications
    try {
      const templates = generateEmailTemplates()

      // Email to assigned provider
      const providerEmail = templates.providerAssignment({
        providerName: provider.name,
        requestId: id,
        customerName: serviceRequest.customerName,
        customerAddress: serviceRequest.customerAddress,
        preferredDate: serviceRequest.preferredDate
          .toISOString()
          .split('T')[0],
        preferredTime: serviceRequest.preferredTime,
      })
      await sendEmail({
        to: provider.email,
        subject: providerEmail.subject,
        html: providerEmail.html,
      })

      // Email to customer
      const customerEmail = templates.customerProviderDetails({
        customerName: serviceRequest.customerName,
        providerName: provider.name,
        providerPhone: provider.phone,
        providerEmail: provider.email,
        requestId: id,
      })
      await sendEmail({
        to: serviceRequest.customerEmail,
        subject: customerEmail.subject,
        html: customerEmail.html,
      })

      // Email to non-selected providers (if any)
      const nonSelectedProviders = interestedProviders.filter(
        (p: any) => p.providerId !== providerId
      )

      for (const nonSelected of nonSelectedProviders) {
        try {
          await sendEmail({
            to: nonSelected.providerEmail,
            subject: `Job Assignment Update - Request #${id}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563EB;">Job Assignment Update</h2>
                <p>Dear ${nonSelected.providerName},</p>
                <p>This job has been assigned to another provider.</p>
                <p><strong>Request ID:</strong> #${id}</p>
                <p>Thank you for your interest. We have other opportunities available.</p>
                <p>Best regards,<br><strong>HomeSwift Team</strong></p>
              </div>
            `,
          })
        } catch (emailError) {
          console.error(`Failed to send email to ${nonSelected.providerEmail}:`, emailError)
        }
      }
    } catch (emailError) {
      console.error('Error sending assignment emails:', emailError)
      // Don't fail the request if email fails
    }

    const response = NextResponse.json({
      message: 'Provider assigned successfully',
      request: updated,
      notifiedProviders: allInterestedProviderIds.length,
    })
    return addSecurityHeaders(response)
  } catch (error: any) {
    console.error('Assign provider error:', error)
    const response = NextResponse.json(
      { error: error.message || 'Failed to assign provider' },
      { status: 500 }
    )
    return addSecurityHeaders(response)
  }
}

/**
 * DELETE /api/service-requests/[id]/assign-provider
 * Admin endpoint to reject/remove a provider from interested list
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      const response = NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      )
      return addSecurityHeaders(response)
    }

    const searchParams = request.nextUrl.searchParams
    let providerId = searchParams.get('providerId')
    let adminEmail = searchParams.get('adminEmail')

    // Sanitize inputs
    adminEmail = adminEmail ? sanitizeEmail(adminEmail) : null
    providerId = providerId ? sanitizeNumber(providerId).toString() : null

    if (!providerId || parseInt(providerId) <= 0) {
      const response = NextResponse.json(
        { error: 'Valid provider ID is required' },
        { status: 400 }
      )
      return addSecurityHeaders(response)
    }

    if (!adminEmail || !validateEmail(adminEmail)) {
      const response = NextResponse.json(
        { error: 'Valid admin email is required for audit trail' },
        { status: 400 }
      )
      return addSecurityHeaders(response)
    }

    // Verify admin user exists and has admin role
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true, role: true },
    })

    if (!adminUser || adminUser.role !== 'admin') {
      const response = NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
      return addSecurityHeaders(response)
    }

    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { requestId: id },
    })

    if (!serviceRequest) {
      return NextResponse.json(
        { error: 'Service request not found' },
        { status: 404 }
      )
    }

    // Parse interested providers
    let interestedProviders: any[] = []
    if (serviceRequest.interestedProviders) {
      try {
        interestedProviders = JSON.parse(serviceRequest.interestedProviders)
      } catch {
        interestedProviders = []
      }
    }

    // Remove provider from interested list
    const providerIdNum = parseInt(providerId)
    const beforeCount = interestedProviders.length
    interestedProviders = interestedProviders.filter(
      (p: any) => p.providerId !== providerIdNum
    )

    if (interestedProviders.length === beforeCount) {
      return NextResponse.json(
        { error: 'Provider not found in interested list' },
        { status: 404 }
      )
    }

    // Update status if no more interested providers
    let newStatus = serviceRequest.status
    if (interestedProviders.length === 0 && serviceRequest.status === 'interested') {
      newStatus = 'broadcasted'
    }

    // Update audit log
    let auditLog: any[] = []
    if (serviceRequest.auditLog) {
      try {
        auditLog = JSON.parse(serviceRequest.auditLog)
      } catch {
        auditLog = []
      }
    }

    auditLog.push({
      action: 'provider_rejected',
      rejectedBy: adminEmail,
      providerId: providerIdNum,
      timestamp: new Date().toISOString(),
      details: `Admin ${adminEmail} removed provider from interested list`,
    })

    // Log audit event
    await logAuditEvent({
      action: 'provider_rejected',
      userId: adminUser.id,
      userEmail: adminEmail,
      userRole: 'admin',
      resourceType: 'service_request',
      resourceId: id,
      details: {
        providerId: providerIdNum,
      },
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    })

    // Update the service request
    const updated = await prisma.serviceRequest.update({
      where: { requestId: id },
      data: {
        interestedProviders: JSON.stringify(interestedProviders),
        status: newStatus,
        auditLog: JSON.stringify(auditLog),
      },
      include: {
        customer: true,
        provider: true,
      },
    })

    const response = NextResponse.json({
      message: 'Provider removed from interested list',
      request: updated,
      remainingInterested: interestedProviders.length,
    })
    return addSecurityHeaders(response)
  } catch (error: any) {
    console.error('Reject provider error:', error)
    const response = NextResponse.json(
      { error: error.message || 'Failed to reject provider' },
      { status: 500 }
    )
    return addSecurityHeaders(response)
  }
}

