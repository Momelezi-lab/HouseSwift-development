/**
 * Payment State Machine
 * 
 * States:
 * - pending: Payment submitted, awaiting verification
 * - in_escrow: Payment verified, held in escrow
 * - released: Payment released to provider
 * - refunded: Payment refunded to customer
 * 
 * Transitions:
 * - pending -> in_escrow: Admin verifies payment
 * - in_escrow -> released: Job completed, auto-release or admin manual release
 * - in_escrow -> refunded: Dispute resolved in customer favor or cancellation
 * - pending -> refunded: Payment rejected, refunded immediately
 */

export type PaymentStatus = 'pending' | 'in_escrow' | 'released' | 'refunded';

export interface PaymentTransition {
  from: PaymentStatus;
  to: PaymentStatus;
  allowed: boolean;
  requiresAdmin: boolean;
  description: string;
}

const VALID_TRANSITIONS: PaymentTransition[] = [
  {
    from: 'pending',
    to: 'in_escrow',
    allowed: true,
    requiresAdmin: true,
    description: 'Admin verifies payment and moves to escrow',
  },
  {
    from: 'pending',
    to: 'refunded',
    allowed: true,
    requiresAdmin: true,
    description: 'Payment rejected, refunded immediately',
  },
  {
    from: 'in_escrow',
    to: 'released',
    allowed: true,
    requiresAdmin: false, // Can be auto-released on job completion
    description: 'Payment released to provider (auto or manual)',
  },
  {
    from: 'in_escrow',
    to: 'refunded',
    allowed: true,
    requiresAdmin: true,
    description: 'Dispute resolved or cancellation, refunded to customer',
  },
];

/**
 * Check if a payment state transition is valid
 */
export function canTransition(
  from: PaymentStatus,
  to: PaymentStatus
): { allowed: boolean; requiresAdmin: boolean; description?: string } {
  const transition = VALID_TRANSITIONS.find(
    (t) => t.from === from && t.to === to
  );

  if (!transition) {
    return {
      allowed: false,
      requiresAdmin: false,
      description: `Invalid transition from ${from} to ${to}`,
    };
  }

  return {
    allowed: transition.allowed,
    requiresAdmin: transition.requiresAdmin,
    description: transition.description,
  };
}

/**
 * Get all valid next states for a given current state
 */
export function getValidNextStates(
  currentState: PaymentStatus
): PaymentStatus[] {
  return VALID_TRANSITIONS.filter((t) => t.from === currentState).map(
    (t) => t.to
  );
}

/**
 * Validate payment state transition
 */
export function validateTransition(
  currentStatus: PaymentStatus,
  newStatus: PaymentStatus,
  isAdmin: boolean
): { valid: boolean; error?: string } {
  const transition = canTransition(currentStatus, newStatus);

  if (!transition.allowed) {
    return {
      valid: false,
      error: transition.description || 'Invalid state transition',
    };
  }

  if (transition.requiresAdmin && !isAdmin) {
    return {
      valid: false,
      error: 'This transition requires admin privileges',
    };
  }

  return { valid: true };
}

