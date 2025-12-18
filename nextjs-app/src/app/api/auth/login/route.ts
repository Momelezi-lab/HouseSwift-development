import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { email, password } = data;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    // Check database connection
    try {
      await prisma.$connect();
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return NextResponse.json(
        {
          error:
            "Database connection failed. Please check your DATABASE_URL environment variable.",
        },
        { status: 500 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log(`Login attempt failed: User not found for email: ${email}`);
      // Check if this is an admin login attempt
      if (email.toLowerCase().includes("admin")) {
        return NextResponse.json(
          {
            error: "Invalid email or password",
            hint: "Admin user may not exist. Create it at /api/admin/create-admin or visit /setup-admin.html",
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      console.log(`Login attempt failed: Invalid password for email: ${email}`);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Remove password hash from response, explicitly include role
    const { passwordHash: _, ...userResponse } = user;

    // Ensure role is included (default to 'customer' if not set)
    const userWithRole = {
      ...userResponse,
      role: user.role || "customer",
    };

    console.log("Login successful - User:", email, "Role:", user.role);

    return NextResponse.json({
      message: "Login successful",
      user: userWithRole,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to login" },
      { status: 500 }
    );
  }
}
