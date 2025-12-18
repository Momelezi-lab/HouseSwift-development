import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * One-time initialization endpoint
 * Creates the default admin user if no admin exists
 * GET /api/admin/init
 */
export async function GET(request: NextRequest) {
  try {
    // Check if any admin user exists
    const adminExists = await prisma.user.findFirst({
      where: { role: 'admin' },
    })

    if (adminExists) {
      return NextResponse.json({
        message: 'Admin user already exists',
        adminEmail: adminExists.email,
        hint: 'If you need to reset the password, use POST /api/admin/create-admin',
      })
    }

    // Create default admin user
    const defaultEmail = 'admin@homeswift.com'
    const defaultPassword = 'admin123'
    const passwordHash = await bcrypt.hash(defaultPassword, 10)

    const admin = await prisma.user.create({
      data: {
        email: defaultEmail,
        name: 'Admin User',
        passwordHash,
        role: 'admin',
        registered: new Date().toISOString().split('T')[0],
      },
    })

    const { passwordHash: _, ...adminResponse } = admin

    return NextResponse.json({
      message: 'Default admin user created successfully',
      user: adminResponse,
      credentials: {
        email: defaultEmail,
        password: defaultPassword,
        warning: 'Please change the password after first login!',
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('Init admin error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initialize admin user' },
      { status: 500 }
    )
  }
}

