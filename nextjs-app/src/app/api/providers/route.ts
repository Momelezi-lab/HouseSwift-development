import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const providers = await prisma.serviceProvider.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(providers)
  } catch (error: any) {
    console.error('Get providers error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log('Received provider data:', data)

    const requiredFields = ['name', 'serviceType', 'phone', 'email']
    for (const field of requiredFields) {
      if (!data[field]) {
        console.error(`Missing required field: ${field}`)
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Check if email already exists
    const existing = await prisma.serviceProvider.findFirst({
      where: { email: data.email },
    })
    if (existing) {
      console.error('Email already exists:', data.email)
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    console.log('Creating provider with data:', {
      name: data.name,
      serviceType: data.serviceType,
      phone: data.phone,
      email: data.email,
      address: data.address,
      experienceYears: data.experienceYears || 0,
      hourlyRate: data.hourlyRate || 0,
      rating: data.rating || 0,
      totalBookings: data.totalBookings || 0,
      status: data.status || 'active',
      registered: new Date().toISOString().split('T')[0],
    })

    const provider = await prisma.serviceProvider.create({
      data: {
        name: data.name,
        serviceType: data.serviceType,
        phone: data.phone,
        email: data.email,
        address: data.address,
        experienceYears: data.experienceYears || 0,
        hourlyRate: data.hourlyRate || 0,
        rating: data.rating || 0,
        totalBookings: data.totalBookings || 0,
        status: data.status || 'active',
        registered: new Date().toISOString().split('T')[0],
      },
    })

    console.log('Provider created successfully:', provider)
    return NextResponse.json(
      { message: 'Provider created', provider },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Create provider error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    })
    return NextResponse.json(
      { error: error.message || 'Failed to create provider', details: error.meta },
      { status: 500 }
    )
  }
}

