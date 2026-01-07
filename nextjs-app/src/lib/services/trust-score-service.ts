import { prisma } from '@/lib/prisma';

/**
 * Trust Score Computation Service
 * 
 * TrustScore is a computed signal based on:
 * - Reliability (on-time completion, no cancellations)
 * - Completion rate
 * - Cancellation rate
 * - Average rating
 * - Verification level
 * 
 * Formula: trust_score = (reliability * 0.3) + (completion_rate * 100 * 0.3) + 
 *          ((5 - cancellation_rate * 100) * 0.2) + (average_rating * 20 * 0.15) + 
 *          (verification_level * 33.33 * 0.05)
 * 
 * All scores normalized to 0-100 range
 */

export interface TrustScoreData {
  providerId: number;
  reliabilityScore: number;
  completionRate: number;
  cancellationRate: number;
  averageRating: number;
  verificationLevel: number;
  trustScore: number;
}

/**
 * Compute trust score for a provider
 */
export async function computeTrustScore(providerId: number): Promise<TrustScoreData> {
  // Get all jobs for this provider
  const jobs = await prisma.serviceRequest.findMany({
    where: {
      assignedProviderId: providerId,
      status: {
        in: ['completed', 'cancelled', 'in_progress', 'assigned'],
      },
    },
  });

  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const cancelledJobs = jobs.filter(j => j.status === 'cancelled').length;
  
  // Calculate completion rate (0-1)
  const completionRate = totalJobs > 0 ? completedJobs / totalJobs : 0;
  
  // Calculate cancellation rate (0-1)
  const cancellationRate = totalJobs > 0 ? cancelledJobs / totalJobs : 0;

  // Get average rating from reviews
  const reviews = await prisma.review.findMany({
    where: { providerId },
    select: { rating: true },
  });

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // Calculate reliability score (0-100)
  // Based on: on-time completion, no last-minute cancellations
  let reliabilityScore = 50; // Base score
  
  if (totalJobs > 0) {
    // Increase reliability for completed jobs
    reliabilityScore += (completionRate * 40);
    
    // Decrease reliability for cancellations
    reliabilityScore -= (cancellationRate * 30);
    
    // Check for on-time completions (jobs completed on or before preferred date)
    const onTimeCompletions = jobs.filter(j => {
      if (j.status !== 'completed' || !j.completedAt) return false;
      return j.completedAt <= j.preferredDate;
    }).length;
    
    const onTimeRate = totalJobs > 0 ? onTimeCompletions / totalJobs : 0;
    reliabilityScore += (onTimeRate * 20);
  }

  // Clamp reliability score to 0-100
  reliabilityScore = Math.max(0, Math.min(100, reliabilityScore));

  // Get verification level from provider profile
  const providerProfile = await prisma.providerProfile.findUnique({
    where: { providerId },
    select: { verificationStatus: true },
  });

  let verificationLevel = 0;
  if (providerProfile) {
    switch (providerProfile.verificationStatus) {
      case 'verified':
        verificationLevel = 3;
        break;
      case 'pending':
        verificationLevel = 1;
        break;
      case 'rejected':
        verificationLevel = 0;
        break;
      default:
        verificationLevel = 0;
    }
  }

  // Calculate final trust score (0-100)
  // Weighted formula:
  const trustScore = 
    (reliabilityScore * 0.3) +                    // 30% reliability
    (completionRate * 100 * 0.3) +                // 30% completion rate
    ((1 - cancellationRate) * 100 * 0.2) +        // 20% low cancellation rate
    (averageRating * 20 * 0.15) +                 // 15% average rating (0-5 -> 0-100)
    (verificationLevel * 33.33 * 0.05);           // 5% verification level

  // Clamp to 0-100
  const finalTrustScore = Math.max(0, Math.min(100, trustScore));

  return {
    providerId,
    reliabilityScore,
    completionRate,
    cancellationRate,
    averageRating,
    verificationLevel,
    trustScore: finalTrustScore,
  };
}

/**
 * Update or create trust score for a provider
 */
export async function updateTrustScore(providerId: number): Promise<void> {
  const trustScoreData = await computeTrustScore(providerId);

  // Get job counts
  const jobs = await prisma.serviceRequest.findMany({
    where: {
      assignedProviderId: providerId,
      status: {
        in: ['completed', 'cancelled', 'in_progress', 'assigned'],
      },
    },
  });

  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const cancelledJobs = jobs.filter(j => j.status === 'cancelled').length;

  const reviews = await prisma.review.findMany({
    where: { providerId },
  });

  // Upsert trust score
  await prisma.trustScore.upsert({
    where: { providerId },
    create: {
      providerId,
      reliabilityScore: trustScoreData.reliabilityScore,
      completionRate: trustScoreData.completionRate,
      cancellationRate: trustScoreData.cancellationRate,
      averageRating: trustScoreData.averageRating,
      verificationLevel: trustScoreData.verificationLevel,
      trustScore: trustScoreData.trustScore,
      totalJobs,
      completedJobs,
      cancelledJobs,
      totalReviews: reviews.length,
    },
    update: {
      reliabilityScore: trustScoreData.reliabilityScore,
      completionRate: trustScoreData.completionRate,
      cancellationRate: trustScoreData.cancellationRate,
      averageRating: trustScoreData.averageRating,
      verificationLevel: trustScoreData.verificationLevel,
      trustScore: trustScoreData.trustScore,
      totalJobs,
      completedJobs,
      cancelledJobs,
      totalReviews: reviews.length,
    },
  });
}

/**
 * Trigger trust score update on job completion
 */
export async function onJobCompleted(jobId: number): Promise<void> {
  const job = await prisma.serviceRequest.findUnique({
    where: { requestId: jobId },
    select: { assignedProviderId: true },
  });

  if (job?.assignedProviderId) {
    await updateTrustScore(job.assignedProviderId);
  }
}

/**
 * Trigger trust score update on job cancellation
 */
export async function onJobCancelled(jobId: number): Promise<void> {
  const job = await prisma.serviceRequest.findUnique({
    where: { requestId: jobId },
    select: { assignedProviderId: true },
  });

  if (job?.assignedProviderId) {
    await updateTrustScore(job.assignedProviderId);
  }
}

/**
 * Trigger trust score update on review submission
 */
export async function onReviewSubmitted(reviewId: number): Promise<void> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { providerId: true },
  });

  if (review?.providerId) {
    await updateTrustScore(review.providerId);
  }
}

/**
 * Trigger trust score update on dispute resolution
 */
export async function onDisputeResolved(disputeId: number): Promise<void> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    select: { providerId: true, status: true },
  });

  if (dispute?.providerId && dispute.status === 'resolved') {
    // Dispute resolution may affect trust score
    // For now, just recalculate
    await updateTrustScore(dispute.providerId);
  }
}

