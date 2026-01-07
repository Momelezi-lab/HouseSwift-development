import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { rateLimit, getClientIdentifier } from '@/lib/security/rate-limit'
import { sanitizeEmail, sanitizeString, sanitizePhone, validateEmail, validatePassword, validatePhone } from '@/lib/security/validation'
import { addSecurityHeaders } from '@/lib/security/security-headers'
import { logAuditEvent, getClientIp } from '@/lib/security/audit-log'
import { generateAccessToken, generateRefreshToken, setRefreshTokenCookie } from '@/lib/security/jwt'

// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  const response = NextResponse.json({}, { headers: corsHeaders })
  return addSecurityHeaders(response)
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 3 signups per hour per IP
    const clientId = getClientIdentifier(request)
    const rateLimitResult = rateLimit(clientId, {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
    })

    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        {
          error: 'Too many signup attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        { status: 429, headers: corsHeaders }
      )
      addSecurityHeaders(response)
      response.headers.set('X-RateLimit-Limit', '3')
      response.headers.set('X-RateLimit-Remaining', '0')
      return response
    }

    const data = await request.json()
    let { name, businessName, email, password, phone, userType, serviceType, address, experienceYears } = data

    // Sanitize inputs
    name = sanitizeString(name)
    email = sanitizeEmail(email)
    phone = phone ? sanitizePhone(phone) : undefined
    businessName = businessName ? sanitizeString(businessName) : undefined
    address = address ? sanitizeString(address) : undefined

    // Validate required fields
    if (!name || !email || !password) {
      const response = NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
      return addSecurityHeaders(response)
    }

    // Validate email format
    if (!validateEmail(email)) {
      const response = NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: corsHeaders }
      )
      return addSecurityHeaders(response)
    }

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      const response = NextResponse.json(
        { error: passwordValidation.error },
        { status: 400, headers: corsHeaders }
      )
      return addSecurityHeaders(response)
    }

    // Validate phone if provided
    if (phone && !validatePhone(phone)) {
      const response = NextResponse.json(
        { error: 'Invalid phone number format. Use South African format (e.g., 0123456789 or +27123456789)' },
        { status: 400, headers: corsHeaders }
      )
      return addSecurityHeaders(response)
    }

    // Check if it's a provider signup
    const isProvider = userType === 'provider' || !!serviceType

    // For providers, validate required fields
    if (isProvider && !serviceType) {
      return NextResponse.json(
        { error: 'Service type is required for service provider signup' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409, headers: corsHeaders }
      )
    }

    // Check if service provider exists with this email
    if (isProvider) {
      const existingProvider = await prisma.serviceProvider.findUnique({
        where: { email },
      })
      if (existingProvider) {
        return NextResponse.json(
          { error: 'Email already registered as a service provider' },
          { status: 409, headers: corsHeaders }
        )
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)
    const registeredDate = new Date().toISOString().split('T')[0]

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone,
        role: isProvider ? 'provider' : 'customer',
        registered: registeredDate,
      },
    })

    // If provider, also create ServiceProvider record
    let provider = null
    if (isProvider) {
      // Use business name if provided, otherwise use person's name
      const providerName = businessName || name
      provider = await prisma.serviceProvider.create({
        data: {
          name: providerName,
          email,
          phone: phone || '',
          serviceType,
          address: address || null,
          experienceYears: experienceYears ? parseInt(experienceYears) : 0,
          registered: registeredDate,
          status: 'active',
        },
      })
    }

    // Remove password hash from response
    const { passwordHash: _, ...userResponse } = user

    // Generate JWT tokens (auto-login after signup)
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'customer',
      name: user.name,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'customer',
      name: user.name,
    });

    // Set refresh token in httpOnly cookie
    await setRefreshTokenCookie(refreshToken);

    // Log successful signup
    await logAuditEvent({
      action: 'user_signup',
      userId: user.id,
      userEmail: email,
      userRole: isProvider ? 'provider' : 'customer',
      resourceType: 'user',
      resourceId: user.id,
      details: { isProvider, serviceType },
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    })

    const response = NextResponse.json(
      {
        message: isProvider ? 'Service provider registered successfully' : 'User registered successfully',
        accessToken, // Return access token for auto-login
        user: userResponse,
        provider: provider || undefined,
      },
      { status: 201, headers: corsHeaders }
    )
    addSecurityHeaders(response)
    response.headers.set('X-RateLimit-Limit', '3')
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    return response
  } catch (error: any) {
    console.error('Signup error:', error)
    const response = NextResponse.json(
      { error: error.message || 'Failed to register user' },
      { status: 500, headers: corsHeaders }
    )
    return addSecurityHeaders(response)
  }
}

