# Trust Score Implementation

## ✅ Implemented

### Backend

1. **Trust Score Computation Service** (`src/lib/services/trust-score-service.ts`)
   - Automatic calculation based on:
     - Reliability score (on-time completion, no cancellations)
     - Completion rate (completed jobs / total jobs)
     - Cancellation rate (cancelled jobs / total jobs)
     - Average rating (from reviews)
     - Verification level (from provider profile)
   - Formula: Weighted combination of all factors (0-100 scale)

2. **API Endpoint** (`/api/trust-scores/[providerId]`)
   - GET: Retrieve trust score for a provider
   - POST: Manually recalculate (admin only)
   - Auto-creates trust score if doesn't exist

3. **Automatic Triggers**
   - `onJobCompleted()` - Updates trust score when job completed
   - `onJobCancelled()` - Updates trust score when job cancelled
   - `onReviewSubmitted()` - Updates trust score when review submitted
   - `onDisputeResolved()` - Updates trust score when dispute resolved

### Frontend

1. **Provider Dashboard Integration**
   - Trust score card in stats section
   - Visual progress bar
   - Trust score breakdown section showing:
     - Reliability score
     - Completion rate
     - Cancellation rate
     - Average rating
   - Note explaining trust score is computed only

2. **API Client** (`src/lib/api.ts`)
   - `trustScoreApi.getByProviderId()` - Get trust score
   - `trustScoreApi.recalculate()` - Recalculate (admin)

## 📊 Trust Score Formula

```
trust_score = 
  (reliabilityScore * 0.3) +                    // 30% reliability
  (completionRate * 100 * 0.3) +                // 30% completion rate
  ((1 - cancellationRate) * 100 * 0.2) +       // 20% low cancellation rate
  (averageRating * 20 * 0.15) +                 // 15% average rating (0-5 -> 0-100)
  (verificationLevel * 33.33 * 0.05)           // 5% verification level
```

All scores normalized to 0-100 range.

## 🔄 Integration Points

### Job Completion
When a job is marked as completed, call:
```typescript
import { onJobCompleted } from '@/lib/services/trust-score-service';
await onJobCompleted(jobId);
```

### Job Cancellation
When a job is cancelled, call:
```typescript
import { onJobCancelled } from '@/lib/services/trust-score-service';
await onJobCancelled(jobId);
```

### Review Submission
When a review is submitted, call:
```typescript
import { onReviewSubmitted } from '@/lib/services/trust-score-service';
await onReviewSubmitted(reviewId);
```

### Dispute Resolution
When a dispute is resolved, call:
```typescript
import { onDisputeResolved } from '@/lib/services/trust-score-service';
await onDisputeResolved(disputeId);
```

## 📝 Next Steps

1. **Integrate Triggers**: Add trust score updates to:
   - Job status update endpoints
   - Review creation endpoint
   - Dispute resolution endpoint

2. **Customer View**: Show trust score to customers during:
   - Provider selection
   - Booking confirmation
   - Provider profile view

3. **Admin View**: Add trust score to:
   - Provider management page
   - Job assignment interface

## 🎨 UI Features

- **Trust Score Card**: Prominent display with progress bar
- **Breakdown Section**: Detailed metrics
- **Visual Indicators**: Color-coded progress bars
- **Auto-refresh**: Trust score updates automatically

## 🔒 Security

- Trust score is **computed only** - no manual editing
- Only admins can trigger recalculation
- Trust score updates are logged in audit trail

