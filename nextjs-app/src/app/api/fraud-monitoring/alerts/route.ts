import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSecurityHeaders } from '@/lib/security/security-headers';
import { getAuthenticatedUser } from '@/lib/security/auth-middleware';

/**
 * GET /api/fraud-monitoring/alerts
 * Admin endpoint to retrieve fraud alerts based on suspicious patterns
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      const response = NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Verify user is admin
    if (user.role !== 'admin') {
      const response = NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    const alerts: any[] = [];

    // 1. Multiple accounts from same IP (last 7 days)
    const recentLogs = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
        ipAddress: { not: null },
      },
      select: {
        userId: true,
        userEmail: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    // Group by IP address
    const ipGroups: { [key: string]: any[] } = {};
    recentLogs.forEach((log) => {
      if (log.ipAddress && log.ipAddress !== 'unknown') {
        if (!ipGroups[log.ipAddress]) {
          ipGroups[log.ipAddress] = [];
        }
        ipGroups[log.ipAddress].push(log);
      }
    });

    // Find IPs with multiple unique users
    Object.entries(ipGroups).forEach(([ip, logs]) => {
      const uniqueUsers = new Set(logs.map((l) => l.userId).filter(Boolean));
      if (uniqueUsers.size > 3) {
        alerts.push({
          type: 'multiple_accounts_same_ip',
          severity: 'high',
          title: 'Multiple accounts from same IP address',
          description: `IP ${ip} has ${uniqueUsers.size} different user accounts`,
          details: {
            ip,
            userCount: uniqueUsers.size,
            userEmails: Array.from(new Set(logs.map((l) => l.userEmail).filter(Boolean))),
          },
          detectedAt: new Date(),
        });
      }
    });

    // 2. Rapid job cancellations (provider cancelling multiple jobs)
    const cancelledJobs = await prisma.serviceRequest.findMany({
      where: {
        status: 'cancelled',
        updatedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
        assignedProviderId: { not: null },
      },
      select: {
        requestId: true,
        assignedProviderId: true,
        providerEmail: true,
        updatedAt: true,
      },
    });

    // Group by provider
    const providerCancellations: { [key: number]: any[] } = {};
    cancelledJobs.forEach((job) => {
      if (job.assignedProviderId) {
        if (!providerCancellations[job.assignedProviderId]) {
          providerCancellations[job.assignedProviderId] = [];
        }
        providerCancellations[job.assignedProviderId].push(job);
      }
    });

    Object.entries(providerCancellations).forEach(([providerId, jobs]) => {
      if (jobs.length > 5) {
        alerts.push({
          type: 'high_cancellation_rate',
          severity: 'medium',
          title: 'High job cancellation rate',
          description: `Provider ${jobs[0].providerEmail} has cancelled ${jobs.length} jobs in the last 30 days`,
          details: {
            providerId: parseInt(providerId),
            providerEmail: jobs[0].providerEmail,
            cancellationCount: jobs.length,
          },
          detectedAt: new Date(),
        });
      }
    });

    // 3. Unverified providers with many jobs
    const providers = await prisma.serviceProvider.findMany({
      include: {
        profile: true,
        _count: {
          select: {
            serviceRequests: {
              where: {
                status: { in: ['assigned', 'in_progress', 'completed'] },
              },
            },
          },
        },
      },
    });

    providers.forEach((provider) => {
      const verificationStatus = provider.profile?.verificationStatus || 'pending';
      const jobCount = provider._count.serviceRequests;
      
      if (verificationStatus === 'pending' && jobCount > 10) {
        alerts.push({
          type: 'unverified_provider_high_activity',
          severity: 'medium',
          title: 'Unverified provider with high activity',
          description: `Provider ${provider.email} has ${jobCount} jobs but is still unverified`,
          details: {
            providerId: provider.id,
            providerEmail: provider.email,
            jobCount,
            verificationStatus,
          },
          detectedAt: new Date(),
        });
      }
    });

    // 4. Suspicious review patterns (all 5-star or all 1-star from same user)
    const reviews = await prisma.review.groupBy({
      by: ['reviewedBy', 'reviewedUserId'],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        },
      },
      _count: { id: true },
      _avg: { rating: true },
    });

    reviews.forEach((review) => {
      const avgRating = review._avg.rating || 0;
      const count = review._count.id;
      
      if (count > 10 && (avgRating === 5 || avgRating === 1)) {
        alerts.push({
          type: 'suspicious_review_pattern',
          severity: 'low',
          title: 'Suspicious review pattern detected',
          description: `User has ${count} reviews with an average rating of ${avgRating.toFixed(1)}`,
          details: {
            reviewedBy: review.reviewedBy,
            reviewedUserId: review.reviewedUserId,
            reviewCount: count,
            averageRating: avgRating,
          },
          detectedAt: new Date(),
        });
      }
    });

    // Sort by severity (high -> medium -> low)
    const severityOrder = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const response = NextResponse.json({
      alerts,
      total: alerts.length,
      high: alerts.filter((a) => a.severity === 'high').length,
      medium: alerts.filter((a) => a.severity === 'medium').length,
      low: alerts.filter((a) => a.severity === 'low').length,
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('Fraud monitoring error:', error);
    const response = NextResponse.json(
      { error: error.message || 'Failed to fetch fraud alerts' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}


