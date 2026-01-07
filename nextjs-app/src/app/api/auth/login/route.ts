import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import { sanitizeEmail, validateEmail } from "@/lib/security/validation";
import { addSecurityHeaders } from "@/lib/security/security-headers";
import { logAuditEvent, getClientIp } from "@/lib/security/audit-log";
import {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
} from "@/lib/security/jwt";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    const clientId = getClientIdentifier(request);
    const rateLimitResult = rateLimit(clientId, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    });

    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        {
          error: "Too many login attempts. Please try again later.",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        { status: 429 }
      );
      addSecurityHeaders(response);
      response.headers.set("X-RateLimit-Limit", "5");
      response.headers.set("X-RateLimit-Remaining", "0");
      response.headers.set("X-RateLimit-Reset", rateLimitResult.resetTime.toString());
      return response;
    }

    const data = await request.json();
    let { email, password } = data;

    // Sanitize and validate input
    email = sanitizeEmail(email);
    if (!email || !password) {
      const response = NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    if (!validateEmail(email)) {
      const response = NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    // Check database connection
    try {
      // Test connection with a simple query instead of $connect()
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbError: any) {
      console.error("Database connection error:", dbError);
      const errorMessage = dbError?.message || "Unknown database error";
      const dbUrl = process.env.DATABASE_URL || "NOT SET";
      console.error("DATABASE_URL:", dbUrl.substring(0, 30) + (dbUrl.length > 30 ? '...' : ''));

      // Provide more helpful error messages
      if (
        errorMessage.includes("P1001") ||
        errorMessage.includes("Can't reach database") ||
        errorMessage.includes("Environment variable not found: DATABASE_URL")
      ) {
        return NextResponse.json(
          {
            error:
              "Database connection failed. Please check your DATABASE_URL environment variable.",
            hint: process.env.NODE_ENV === "development" 
              ? `DATABASE_URL is: ${dbUrl.substring(0, 30)}... Make sure .env.local exists with DATABASE_URL="file:./prisma/dev.db"`
              : "If deployed on Vercel, make sure you've set up a PostgreSQL database and added DATABASE_URL to environment variables.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          error:
            "Database connection failed. Please check your DATABASE_URL environment variable.",
          details:
            process.env.NODE_ENV === "development" ? errorMessage : undefined,
          dbUrl: process.env.NODE_ENV === "development" ? dbUrl.substring(0, 30) + '...' : undefined,
        },
        { status: 500 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log(`Login attempt failed: User not found for email: ${email}`);
      // Log failed login attempt
      await logAuditEvent({
        action: "login_failed",
        userEmail: email,
        resourceType: "auth",
        details: { reason: "user_not_found" },
        timestamp: new Date(),
        ipAddress: getClientIp(request),
      });

      // Check if this is an admin login attempt
      if (email.toLowerCase().includes("admin")) {
        const response = NextResponse.json(
          {
            error: "Invalid email or password",
            hint: "Admin user may not exist. Create it at /api/admin/create-admin or visit /setup-admin.html",
          },
          { status: 401 }
        );
        return addSecurityHeaders(response);
      }
      const response = NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      console.log(`Login attempt failed: Invalid password for email: ${email}`);
      // Log failed login attempt
      await logAuditEvent({
        action: "login_failed",
        userId: user.id,
        userEmail: email,
        userRole: user.role || "customer",
        resourceType: "auth",
        details: { reason: "invalid_password" },
        timestamp: new Date(),
        ipAddress: getClientIp(request),
      });

      const response = NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Remove password hash from response, explicitly include role
    const { passwordHash: _, ...userResponse } = user;

    // Ensure role is included (default to 'customer' if not set)
    const userWithRole = {
      ...userResponse,
      role: user.role || "customer",
    };

    console.log("Login successful - User:", email, "Role:", user.role);

    // Generate JWT tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role || "customer",
      name: user.name,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role || "customer",
      name: user.name,
    });

    // Set refresh token in httpOnly cookie
    await setRefreshTokenCookie(refreshToken);

    // Log successful login
    await logAuditEvent({
      action: "login_success",
      userId: user.id,
      userEmail: email,
      userRole: user.role || "customer",
      resourceType: "auth",
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    });

    const response = NextResponse.json({
      message: "Login successful",
      accessToken, // Return access token in response body
      user: userWithRole,
    });
    addSecurityHeaders(response);
    response.headers.set("X-RateLimit-Limit", "5");
    response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    const response = NextResponse.json(
      { error: error.message || "Failed to login" },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
