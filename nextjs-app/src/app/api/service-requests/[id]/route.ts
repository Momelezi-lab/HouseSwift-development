import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, generateEmailTemplates } from "@/lib/email";
import { onJobCompleted, onJobCancelled } from "@/lib/services/trust-score-service";
import { addSecurityHeaders } from "@/lib/security/security-headers";
import { autoReleasePayment } from "@/lib/services/payment-release";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { requestId: id },
      include: {
        customer: true,
        provider: true,
      },
    });

    if (!serviceRequest) {
      const response = NextResponse.json(
        { error: "Service request not found" },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    const response = NextResponse.json(serviceRequest);
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error("Get service request error:", error);
    const response = NextResponse.json(
      { error: "Failed to fetch service request" },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const data = await request.json();

    const updateableFields = [
      "status",
      "priority",
      "assignedProviderId",
      "providerName",
      "providerPhone",
      "providerEmail",
      "paymentMethod",
      "proofOfPaymentUrl",
      "customerPaymentReceived",
      "providerPaymentMade",
      "commissionCollected",
      "adminNotes",
    ];

    const updateData: any = {};

    // Prisma automatically maps camelCase to snake_case via @map directives
    // So we use the Prisma model field names (camelCase)
    for (const field of updateableFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    // If assignedProviderId is set, fetch and update provider details
    if (
      data.assignedProviderId !== undefined &&
      data.assignedProviderId !== null &&
      data.assignedProviderId !== ""
    ) {
      const providerId = parseInt(data.assignedProviderId.toString());
      const provider = await prisma.serviceProvider.findUnique({
        where: { id: providerId },
      });
      if (provider) {
        updateData.providerName = provider.name;
        updateData.providerPhone = provider.phone;
        updateData.providerEmail = provider.email;
      }
    }

    // Get current service request to compare status
    const currentRequest = await prisma.serviceRequest.findUnique({
      where: { requestId: id },
    });

    if (!currentRequest) {
      return NextResponse.json(
        { error: "Service request not found" },
        { status: 404 }
      );
    }

    const oldStatus = currentRequest.status;
    const newStatus = data.status;

    // Handle status changes and send appropriate emails
    if (newStatus && newStatus !== oldStatus) {
      // Set timestamps for specific statuses
      if (newStatus === "confirmed" && !updateData.confirmedAt) {
        updateData.confirmedAt = new Date();
      }
      if (newStatus === "completed" && !updateData.completedAt) {
        updateData.completedAt = new Date();
      }

      const templates = generateEmailTemplates();

      // Handle confirmed status with provider assignment
      if (newStatus === "confirmed") {
        const providerId =
          data.assignedProviderId !== undefined &&
          data.assignedProviderId !== null &&
          data.assignedProviderId !== ""
            ? parseInt(data.assignedProviderId.toString())
            : currentRequest?.assignedProviderId;

        if (providerId) {
          const provider = await prisma.serviceProvider.findUnique({
            where: { id: providerId },
          });
          if (provider) {
            // Send provider assignment email
            const providerEmail = templates.providerAssignment({
              providerName: provider.name,
              requestId: id,
              customerName: currentRequest.customerName,
              customerAddress: currentRequest.customerAddress,
              preferredDate: currentRequest.preferredDate
                .toISOString()
                .split("T")[0],
              preferredTime: currentRequest.preferredTime,
            });
            await sendEmail({
              to: provider.email,
              subject: providerEmail.subject,
              html: providerEmail.html,
            });

            // Send customer notification with provider details
            const customerEmail = templates.customerProviderDetails({
              customerName: currentRequest.customerName,
              providerName: provider.name,
              providerPhone: provider.phone,
              providerEmail: provider.email,
              requestId: id,
            });
            await sendEmail({
              to: currentRequest.customerEmail,
              subject: customerEmail.subject,
              html: customerEmail.html,
            });
          }
        } else {
          // No provider assigned yet, send general status update
          const statusEmail = templates.statusUpdate({
            customerName: currentRequest.customerName,
            requestId: id,
            oldStatus,
            newStatus,
            preferredDate: currentRequest.preferredDate
              .toISOString()
              .split("T")[0],
            preferredTime: currentRequest.preferredTime,
          });
          await sendEmail({
            to: currentRequest.customerEmail,
            subject: statusEmail.subject,
            html: statusEmail.html,
          });
        }
      } else if (newStatus === "completed") {
        // Send completion email
        const completionEmail = templates.serviceCompletion({
          customerName: currentRequest.customerName,
          requestId: id,
        });
        await sendEmail({
          to: currentRequest.customerEmail,
          subject: completionEmail.subject,
          html: completionEmail.html,
        });

        // Update trust score when job is completed
        if (currentRequest.assignedProviderId) {
          try {
            await onJobCompleted(id);
          } catch (error) {
            console.error("Failed to update trust score on job completion:", error);
            // Don't fail the request if trust score update fails
          }
        }

        // Auto-release payment from escrow
        try {
          const payment = await prisma.payment.findFirst({
            where: {
              jobId: id,
              status: 'in_escrow',
            },
          });
          if (payment) {
            await autoReleasePayment(payment.id);
          }
        } catch (error) {
          console.error("Failed to auto-release payment on job completion:", error);
          // Don't fail the request if payment release fails
        }
      } else if (newStatus === "cancelled") {
        // Update trust score when job is cancelled
        if (currentRequest.assignedProviderId) {
          try {
            await onJobCancelled(id);
          } catch (error) {
            console.error("Failed to update trust score on job cancellation:", error);
            // Don't fail the request if trust score update fails
          }
        }
      } else {
        // Send status update email for all other status changes
        const provider = currentRequest.assignedProviderId
          ? await prisma.serviceProvider.findUnique({
              where: { id: currentRequest.assignedProviderId },
            })
          : null;

        const statusEmail = templates.statusUpdate({
          customerName: currentRequest.customerName,
          requestId: id,
          oldStatus,
          newStatus,
          providerName: provider?.name,
          providerPhone: provider?.phone,
          providerEmail: provider?.email,
          preferredDate: currentRequest.preferredDate
            .toISOString()
            .split("T")[0],
          preferredTime: currentRequest.preferredTime,
        });
        await sendEmail({
          to: currentRequest.customerEmail,
          subject: statusEmail.subject,
          html: statusEmail.html,
        });
      }
    }

    const updated = await prisma.serviceRequest.update({
      where: { requestId: id },
      data: updateData,
      include: {
        customer: true,
        provider: true,
      },
    });

    const response = NextResponse.json({
      message: "Service request updated",
      request: updated,
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error("Update service request error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    return NextResponse.json(
      {
        error: error.message || "Failed to update service request",
        details: error.meta,
      },
      { status: 500 }
    );
  }
}
