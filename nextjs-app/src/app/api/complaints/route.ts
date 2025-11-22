import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')?.trim()
    const status = searchParams.get('status')

    console.log('GET /api/complaints - email param:', email)
    console.log('GET /api/complaints - status param:', status)

    const where: any = {}
    if (status) where.status = status

    // Store email filter for post-processing (SQLite doesn't support case-insensitive mode)
    const emailFilter = email?.toLowerCase()

    console.log('GET /api/complaints - emailFilter:', emailFilter)

    let complaints = await prisma.complaint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    console.log('GET /api/complaints - Total complaints found:', complaints.length)
    if (complaints.length > 0) {
      console.log('GET /api/complaints - Sample complaint emails:', 
        complaints.slice(0, 3).map(c => c.email))
    }

    // Case-insensitive email filtering for SQLite
    if (emailFilter) {
      const beforeCount = complaints.length
      complaints = complaints.filter((complaint) => {
        const complaintEmail = complaint.email?.trim().toLowerCase()
        const matches = complaintEmail === emailFilter
        if (!matches && complaintEmail) {
          console.log(`Email mismatch - Looking for: "${emailFilter}", Found: "${complaintEmail}"`)
        }
        return matches
      })
      console.log('GET /api/complaints - After email filter:', 
        `${beforeCount} -> ${complaints.length} complaints`)
      if (beforeCount > 0 && complaints.length === 0) {
        console.log('WARNING: Found', beforeCount, 'complaints but none matched email:', emailFilter)
        const allComplaints = await prisma.complaint.findMany({ select: { email: true } })
        console.log('Sample emails in DB:', allComplaints.slice(0, 5).map(c => `"${c.email}"`))
      }
    }

    console.log('GET /api/complaints - Returning:', complaints.length, 'complaints')
    return NextResponse.json(complaints)
  } catch (error: any) {
    console.error('Get complaints error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch complaints' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const requiredFields = ['name', 'type', 'title', 'description', 'date']
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    const complaint = await prisma.complaint.create({
      data: {
        name: data.name,
        email: data.email,
        type: data.type,
        title: data.title,
        description: data.description,
        status: data.status || 'pending',
        date: data.date,
        serviceProvider: data.serviceProvider,
        desiredResolution: data.desiredResolution,
        contactPreference: data.contactPreference,
        urgencyLevel: data.urgencyLevel,
        serviceDate: data.serviceDate,
        isAnonymous: data.anonymous || false,
        followUpEnabled: data.followUp !== false,
      },
    })

    return NextResponse.json(
      {
        message: 'Complaint created',
        complaint,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Create complaint error:', error)
    return NextResponse.json(
      { error: 'Failed to create complaint' },
      { status: 500 }
    )
  }
}

