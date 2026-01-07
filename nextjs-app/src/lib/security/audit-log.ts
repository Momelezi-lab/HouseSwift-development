import { prisma } from '@/lib/prisma';

export interface AuditLogEntry {
  action: string;
  userId?: number;
  userEmail?: string;
  userRole?: string;
  resourceType: string;
  resourceId?: number;
  details?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    // Store in AuditLog table
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId,
        userEmail: entry.userEmail,
        userRole: entry.userRole,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress: entry.ipAddress,
        createdAt: entry.timestamp,
      },
    });

    // Also store in service request audit_log field for backward compatibility
    if (entry.resourceType === 'service_request' && entry.resourceId) {
      try {
        const serviceRequest = await prisma.serviceRequest.findUnique({
          where: { requestId: entry.resourceId },
          select: { auditLog: true },
        });

        const existingLog = serviceRequest?.auditLog
          ? JSON.parse(serviceRequest.auditLog)
          : [];

        const newLogEntry = {
          action: entry.action,
          userId: entry.userId,
          userEmail: entry.userEmail,
          userRole: entry.userRole,
          timestamp: entry.timestamp.toISOString(),
          details: entry.details,
          ipAddress: entry.ipAddress,
        };

        existingLog.push(newLogEntry);

        await prisma.serviceRequest.update({
          where: { requestId: entry.resourceId },
          data: {
            auditLog: JSON.stringify(existingLog),
          },
        });
      } catch (error) {
        // Don't fail if service request update fails
        console.error('Failed to update service request audit log:', error);
      }
    }
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || realIp || 'unknown';
}

