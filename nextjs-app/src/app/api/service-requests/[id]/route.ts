import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateEmailTemplates } from '@/lib/email'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { requestId: id },
      include: {
        customer: true,
        provider: true,
      },
    })

    if (!serviceRequest) {
      return NextResponse.json(
        { error: 'Service request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(serviceRequest)
  } catch (error: any) {
    console.error('Get service request error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch service request' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const data = await request.json()

    const updateableFields = [
      'status',
      'priority',
      'assignedProviderId',
      'providerName',
      'providerPhone',
      'providerEmail',
      'paymentMethod',
      'customerPaymentReceived',
      'providerPaymentMade',
      'commissionCollected',
      'adminNotes',
    ]

    const updateData: any = {}
    
    // Prisma automatically maps camelCase to snake_case via @map directives
    // So we use the Prisma model field names (camelCase)
    for (const field of updateableFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field]
      }
    }
    
    // If assignedProviderId is set, fetch and update provider details
    if (data.assignedProviderId !== undefined && data.assignedProviderId !== null && data.assignedProviderId !== '') {
      const providerId = parseInt(data.assignedProviderId.toString())
      const provider = await prisma.serviceProvider.findUnique({
        where: { id: providerId },
      })
      if (provider) {
        updateData.providerName = provider.name
        updateData.providerPhone = provider.phone
        updateData.providerEmail = provider.email
      }
    }

    // Handle status changes
    if (data.status === 'confirmed' && !updateData.confirmedAt) {
      updateData.confirmedAt = new Date()
      // Send provider assignment emails
      const request = await prisma.serviceRequest.findUnique({
        where: { requestId: id },
      })
      const providerId = data.assignedProviderId !== undefined && data.assignedProviderId !== null && data.assignedProviderId !== ''
        ? parseInt(data.assignedProviderId.toString()) 
        : request?.assignedProviderId
      if (providerId) {
        const provider = await prisma.serviceProvider.findUnique({
          where: { id: providerId },
        })
        if (provider) {
          const templates = generateEmailTemplates()
          const providerEmail = templates.providerAssignment({
            providerName: provider.name,
            requestId: id,
            customerName: request.customerName,
            customerAddress: request.customerAddress,
            preferredDate: request.preferredDate.toISOString().split('T')[0],
            preferredTime: request.preferredTime,
          })
          await sendEmail({
            to: provider.email,
            subject: providerEmail.subject,
            html: providerEmail.html,
          })

          const customerEmail = templates.customerProviderDetails({
            customerName: request.customerName,
            providerName: provider.name,
            providerPhone: provider.phone,
            providerEmail: provider.email,
            requestId: id,
          })
          await sendEmail({
            to: request.customerEmail,
            subject: customerEmail.subject,
            html: customerEmail.html,
          })
        }
      }
    } else if (data.status === 'completed') {
      updateData.completedAt = new Date()
      const request = await prisma.serviceRequest.findUnique({
        where: { requestId: id },
      })
      if (request) {
        const templates = generateEmailTemplates()
        const completionEmail = templates.serviceCompletion({
          customerName: request.customerName,
          requestId: id,
        })
        await sendEmail({
          to: request.customerEmail,
          subject: completionEmail.subject,
          html: completionEmail.html,
        })
      }
    }

    const updated = await prisma.serviceRequest.update({
      where: { requestId: id },
      data: updateData,
      include: {
        customer: true,
        provider: true,
      },
    })

    return NextResponse.json({
      message: 'Service request updated',
      request: updated,
    })
  } catch (error: any) {
    console.error('Update service request error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    })
    return NextResponse.json(
      { error: error.message || 'Failed to update service request', details: error.meta },
      { status: 500 }
    )
  }
}

