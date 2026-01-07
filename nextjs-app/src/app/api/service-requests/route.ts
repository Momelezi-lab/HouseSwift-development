import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, generateEmailTemplates } from "@/lib/email";
import { Decimal } from "@prisma/client/runtime/library";
import { sanitizeString, sanitizeEmail, sanitizePhone, validateEmail, validatePhone, validateDate, validateTime, validateQuantity } from "@/lib/security/validation";
import { addSecurityHeaders } from "@/lib/security/security-headers";
import { logAuditEvent, getClientIp } from "@/lib/security/audit-log";
import { rateLimit, getClientIdentifier } from "@/lib/security/rate-limit";

const CALLOUT_FEE = 100.0; // R100 callout fee

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 requests per hour per IP
    const clientId = getClientIdentifier(request);
    const rateLimitResult = rateLimit(clientId, {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        {
          error: "Too many booking requests. Please try again later.",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        { status: 429 }
      );
      addSecurityHeaders(response);
      return response;
    }

    const data = await request.json();

    // Sanitize and validate required fields
    const customerName = sanitizeString(data.customer_name);
    const customerEmail = sanitizeEmail(data.customer_email);
    const customerPhone = sanitizePhone(data.customer_phone);
    const customerAddress = sanitizeString(data.customer_address);
    const unitNumber = data.unit_number ? sanitizeString(data.unit_number) : undefined;
    const complexName = data.complex_name ? sanitizeString(data.complex_name) : undefined;
    const accessInstructions = data.access_instructions ? sanitizeString(data.access_instructions) : undefined;
    const additionalNotes = data.additional_notes ? sanitizeString(data.additional_notes) : undefined;

    // Validate required fields
    const requiredFields = [
      { field: "customer_name", value: customerName },
      { field: "customer_email", value: customerEmail },
      { field: "customer_phone", value: customerPhone },
      { field: "customer_address", value: customerAddress },
      { field: "preferred_date", value: data.preferred_date },
      { field: "preferred_time", value: data.preferred_time },
      { field: "items", value: data.items },
    ];
    
    for (const { field, value } of requiredFields) {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        const response = NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }
    }

    // Validate email format
    if (!validateEmail(customerEmail)) {
      const response = NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Validate phone
    if (!validatePhone(customerPhone)) {
      const response = NextResponse.json(
        { error: "Invalid phone number format. Use South African format (e.g., 0123456789 or +27123456789)" },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Normalize phone (10 digits for South Africa)
    const phone = customerPhone
      .replace(/\s+/g, "")
      .replace(/-/g, "")
      .replace("+27", "0");

    // Validate date
    const dateValidation = validateDate(data.preferred_date);
    if (!dateValidation.valid) {
      const response = NextResponse.json(
        { error: dateValidation.error },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }
    const preferredDate = dateValidation.date!;

    // Validate time
    const timeValidation = validateTime(data.preferred_time);
    if (!timeValidation.valid) {
      const response = NextResponse.json(
        { error: timeValidation.error },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Calculate totals
    let totalCustomerPaid = new Decimal(0);
    let totalProviderPayout = new Decimal(0);
    let totalCommissionEarned = new Decimal(0);
    const selectedItemsArray: any[] = [];

    // Process each item
    for (const itemInput of data.items) {
      const category = sanitizeString(itemInput.category);
      const type = sanitizeString(itemInput.type);
      const quantity = itemInput.quantity;
      const is_white = Boolean(itemInput.is_white);

      // Validate quantity
      const quantityValidation = validateQuantity(quantity);
      if (!quantityValidation.valid) {
        const response = NextResponse.json(
          { error: quantityValidation.error },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }
      const validatedQuantity = quantityValidation.value!;

      // Get pricing from database
      const pricing = await prisma.servicePricing.findFirst({
        where: {
          serviceCategory: category,
          serviceType: type,
        },
      });

      if (!pricing) {
        return NextResponse.json(
          { error: `Pricing not found for ${category} - ${type}` },
          { status: 404 }
        );
      }

      // Calculate prices
      let customerLinePrice = new Decimal(
        pricing.customerDisplayPrice.toString()
      );
      let providerLinePrice = new Decimal(pricing.providerBasePrice.toString());

      if (is_white && pricing.isWhiteApplicable) {
        customerLinePrice = customerLinePrice.add(
          new Decimal(pricing.colorSurchargeCustomer.toString())
        );
        providerLinePrice = providerLinePrice.add(
          new Decimal(pricing.colorSurchargeProvider.toString())
        );
      }

      const itemPriceCustomer = customerLinePrice.mul(quantity);
      const itemPriceProvider = providerLinePrice.mul(quantity);
      const itemCommission = itemPriceCustomer.sub(itemPriceProvider);

      totalCustomerPaid = totalCustomerPaid.add(itemPriceCustomer);
      totalProviderPayout = totalProviderPayout.add(itemPriceProvider);
      totalCommissionEarned = totalCommissionEarned.add(itemCommission);

      selectedItemsArray.push({
        category: pricing.serviceCategory,
        type: pricing.serviceType,
        is_white,
        quantity: validatedQuantity,
        customer_price: parseFloat(itemPriceCustomer.toString()),
        provider_price: parseFloat(itemPriceProvider.toString()),
        commission: parseFloat(itemCommission.toString()),
      });
    }

    // Add callout fee
    totalCustomerPaid = totalCustomerPaid.add(CALLOUT_FEE);
    totalCommissionEarned = totalCommissionEarned.add(CALLOUT_FEE);

    // Create or find customer
    let customer = await prisma.customer.findFirst({
      where: { customerEmail: data.customer_email },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          customerName: data.customer_name,
          customerEmail: data.customer_email,
          customerPhone: phone,
        },
      });
    } else {
      await prisma.customer.update({
        where: { customerId: customer.customerId },
        data: { totalBookings: { increment: 1 } },
      });
    }

    // Parse time
    const [hours, minutes] = data.preferred_time.split(":");
    const preferredTime = `${hours}:${minutes}:00`;

    // Create service request
    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        customerId: customer.customerId,
        customerName: customerName,
        customerEmail: customerEmail,
        customerPhone: phone,
        customerAddress: customerAddress,
        unitNumber: unitNumber,
        complexName: complexName,
        accessInstructions: accessInstructions,
        preferredDate: preferredDate,
        preferredTime: preferredTime,
        additionalNotes: additionalNotes,
        selectedItems: JSON.stringify(selectedItemsArray),
        totalCustomerPaid: parseFloat(totalCustomerPaid.toString()),
        totalProviderPayout: parseFloat(totalProviderPayout.toString()),
        totalCommissionEarned: parseFloat(totalCommissionEarned.toString()),
        status: "broadcasted", // Start as broadcasted so all providers can see it
      },
    });

    // Log booking creation
    await logAuditEvent({
      action: "booking_created",
      userEmail: customerEmail,
      resourceType: "service_request",
      resourceId: serviceRequest.requestId,
      details: {
        totalAmount: parseFloat(totalCustomerPaid.toString()),
        itemCount: selectedItemsArray.length,
      },
      timestamp: new Date(),
      ipAddress: getClientIp(request),
    });

    // Send emails
    const templates = generateEmailTemplates();
    const customerEmailTemplate = templates.customerConfirmation({
      customerName: data.customer_name,
      requestId: serviceRequest.requestId,
      totalAmount: parseFloat(totalCustomerPaid.toString()),
      preferredDate: data.preferred_date,
      preferredTime: data.preferred_time,
    });
    await sendEmail({
      to: data.customer_email,
      subject: customerEmailTemplate.subject,
      html: customerEmailTemplate.html,
    });

    const adminEmail = templates.adminAlert({
      requestId: serviceRequest.requestId,
      customerName: data.customer_name,
      totalAmount: parseFloat(totalCustomerPaid.toString()),
    });
    await sendEmail({
      to: process.env.ADMIN_EMAIL || "admin@homeswift.com",
      subject: adminEmail.subject,
      html: adminEmail.html,
    });

    const response = NextResponse.json(
      {
        message: "Service request created successfully",
        request_id: serviceRequest.requestId,
        total_customer_paid: parseFloat(totalCustomerPaid.toString()),
      },
      { status: 201 }
    );
    addSecurityHeaders(response);
    response.headers.set("X-RateLimit-Limit", "10");
    response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
    return response;
  } catch (error: any) {
    console.error("Service request creation error:", error);
    const response = NextResponse.json(
      { error: error.message || "Failed to create service request" },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const category = searchParams.get("category") ? sanitizeString(searchParams.get("category")) : null;
    const search = searchParams.get("search") ? sanitizeString(searchParams.get("search")) : null;
    const customerEmail = searchParams.get("customerEmail") ? sanitizeEmail(searchParams.get("customerEmail")!.trim()) : undefined;

    console.log(
      "GET /api/service-requests - customerEmail param:",
      customerEmail
    );

    const where: any = {};
    if (status) where.status = status;
    if (category) {
      where.selectedItems = { contains: category };
    }
    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { requestId: parseInt(search) || 0 },
      ];
    }

    // Store email filter for post-processing (SQLite doesn't support case-insensitive mode)
    const emailFilter = customerEmail?.toLowerCase();

    console.log("GET /api/service-requests - emailFilter:", emailFilter);
    console.log(
      "GET /api/service-requests - where clause:",
      JSON.stringify(where)
    );

    let requests = await prisma.serviceRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        provider: true,
      },
    });

    console.log(
      "GET /api/service-requests - Total requests found:",
      requests.length
    );
    const allRequestEmails = requests.map((r) => r.customerEmail);
    if (requests.length > 0) {
      console.log(
        "GET /api/service-requests - Sample request emails:",
        allRequestEmails.slice(0, 3)
      );
    }

    // Case-insensitive email filtering for SQLite
    if (emailFilter) {
      const beforeCount = requests.length;
      requests = requests.filter((req) => {
        const reqEmail = req.customerEmail?.trim().toLowerCase();
        const matches = reqEmail === emailFilter;
        if (!matches && reqEmail) {
          console.log(
            `Email mismatch - Looking for: "${emailFilter}", Found: "${reqEmail}"`
          );
        }
        return matches;
      });
      console.log(
        "GET /api/service-requests - After email filter:",
        `${beforeCount} -> ${requests.length} requests`
      );
      if (beforeCount > 0 && requests.length === 0) {
        console.log(
          "WARNING: Found",
          beforeCount,
          "requests but none matched email:",
          emailFilter
        );
        console.log(
          "All emails in DB:",
          allRequestEmails.slice(0, 10).map((e) => `"${e}"`)
        );
      }
    }

    console.log(
      "GET /api/service-requests - Returning:",
      requests.length,
      "requests"
    );
    const response = NextResponse.json(requests);
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error("Get service requests error:", error);
    const response = NextResponse.json(
      { error: "Failed to fetch service requests" },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
