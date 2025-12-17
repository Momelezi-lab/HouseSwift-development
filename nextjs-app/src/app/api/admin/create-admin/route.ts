import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * API endpoint to create an admin user
 * This can be called once to set up the initial admin user in production
 * 
 * Usage: POST /api/admin/create-admin
 * Body: { email: string, password: string, name?: string }
 * 
 * Security: In production, you might want to add additional security checks
 * like requiring a secret token or only allowing this on first deployment
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { email, password, name } = data

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // Update existing user to admin
      const passwordHash = await bcrypt.hash(password, 10)
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          role: 'admin',
          passwordHash,
          name: name || existingUser.name,
        },
      })

      const { passwordHash: _, ...userResponse } = updatedUser

      return NextResponse.json({
        message: 'User updated to admin role',
        user: userResponse,
      })
    } else {
      // Create new admin user
      const passwordHash = await bcrypt.hash(password, 10)
      const newUser = await prisma.user.create({
        data: {
          email,
          name: name || 'Admin User',
          passwordHash,
          role: 'admin',
          registered: new Date().toISOString().split('T')[0],
        },
      })

      const { passwordHash: _, ...userResponse } = newUser

      return NextResponse.json({
        message: 'Admin user created successfully',
        user: userResponse,
      }, { status: 201 })
    }
  } catch (error: any) {
    console.error('Create admin error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create admin user' },
      { status: 500 }
    )
  }
}

