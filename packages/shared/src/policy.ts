import { Money, MoneySchema, validateMoney, generateIdempotencyKey, type IdempotencyKey } from './schema';
import { DoubleEntryLedger, getLedger, ACCOUNTS, createPayPalTransaction, LedgerEntry } from './ledger';

/**
 * Policy Ledger Verifier
 * Enforces autonomous vs approval caps and validates every financial action
 */

export interface PolicyRule {
  id: string;
  actionType: 'autonomous' | 'approval_required';
  maxAmount: Money;
  minAmount?: Money;
  description: string;
  requiresApproval: boolean;
  approverRoles?: string[];
}

export interface PolicyContext {
  actionType: string;
  amount: Money;
  currency: string;
  userId?: string;
  userRole?: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyDecision {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
  policyId: string;
  approverRoles?: string[];
  idempotencyKey: IdempotencyKey;
}

export interface ApprovalRequest {
  id: string;
  policyId: string;
  context: PolicyContext;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}

// Default policy rules
export const DEFAULT_POLICIES: PolicyRule[] = [
  {
    id: 'auto-pay-invoice',
    actionType: 'autonomous',
    maxAmount: { currency_code: 'USD', value: '1000.00' },
    description: 'Autonomously pay invoices up to $1,000',
    requiresApproval: false,
  },
  {
    id: 'auto-create-order',
    actionType: 'autonomous',
    maxAmount: { currency_code: 'USD', value: '5000.00' },
    description: 'Autonomously create orders up to $5,000',
    requiresApproval: false,
  },
  {
    id: 'approval-order-medium',
    actionType: 'approval_required',
    maxAmount: { currency_code: 'USD', value: '10000.00' },
    minAmount: { currency_code: 'USD', value: '5000.01' },
    description: 'Orders $5,000-$10,000 require manager approval',
    requiresApproval: true,
    approverRoles: ['manager', 'finance_lead'],
  },
  {
    id: 'approval-order-large',
    actionType: 'approval_required',
    maxAmount: { currency_code: 'USD', value: '100000.00' },
    minAmount: { currency_code: 'USD', value: '10000.01' },
    description: 'Orders $10,000-$100,000 require director approval',
    requiresApproval: true,
    approverRoles: ['director', 'vp_finance'],
  },
  {
    id: 'approval-order-xl',
    actionType: 'approval_required',
    maxAmount: { currency_code: 'USD', value: '1000000.00' },
    minAmount: { currency_code: 'USD', value: '100000.01' },
    description: 'Orders >$100,000 require executive approval',
    requiresApproval: true,
    approverRoles: ['cfo', 'ceo'],
  },
  {
    id: 'auto-refund',
    actionType: 'autonomous',
    maxAmount: { currency_code: 'USD', value: '500.00' },
    description: 'Autonomously issue refunds up to $500',
    requiresApproval: false,
  },
  {
    id: 'approval-refund',
    actionType: 'approval_required',
    maxAmount: { currency_code: 'USD', value: '5000.00' },
    minAmount: { currency_code: 'USD', value: '500.01' },
    description: 'Refunds $500-$5,000 require approval',
    requiresApproval: true,
    approverRoles: ['manager', 'support_lead'],
  },
  {
    id: 'auto-payout',
    actionType: 'autonomous',
    maxAmount: { currency_code: 'USD', value: '10000.00' },
    description: 'Autonomously process payouts up to $10,000',
    requiresApproval: false,
  },
  {
    id: 'approval-payout',
    actionType: 'approval_required',
    maxAmount: { currency_code: 'USD', value: '100000.00' },
    minAmount: { currency_code: 'USD', value: '10000.01' },
    description: 'Payouts >$10,000 require approval',
    requiresApproval: true,
    approverRoles: ['finance_lead', 'controller'],
  },
];

export class PolicyLedgerVerifier {
  private policies: PolicyRule[];
  private ledger: DoubleEntryLedger;
  private approvalRequests: Map<string, ApprovalRequest> = new Map();
  private decisionLog: PolicyDecision[] = [];

  constructor(policies: PolicyRule[] = DEFAULT_POLICIES) {
    this.policies = policies;
    this.ledger = getLedger();
  }

  /**
   * Evaluate a policy decision for an action
   */
  evaluate(context: PolicyContext): PolicyDecision {
    const { actionType, amount, currency } = context;

    // Validate amount
    const validatedAmount = validateMoney({ currency_code: currency, value: amount.value });

    // Find applicable policy
    const policy = this.findPolicy(actionType, validatedAmount);
    if (!policy) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: `No policy found for action: ${actionType}`,
        policyId: 'none',
        idempotencyKey: generateIdempotencyKey(),
      };
    }

    const amountValue = parseFloat(validatedAmount.value);
    const maxValue = parseFloat(policy.maxAmount.value);
    const minValue = policy.minAmount ? parseFloat(policy.minAmount.value) : 0;

    // Check if amount is within policy range
    if (amountValue > maxValue) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: `Amount ${validatedAmount.value} ${currency} exceeds maximum ${policy.maxAmount.value} for ${policy.id}`,
        policyId: policy.id,
        idempotencyKey: generateIdempotencyKey(),
      };
    }

    if (amountValue < minValue) {
      // Amount is below minimum for this policy, check if there's a lower tier
      const lowerPolicy = this.policies.find(p =>
        p.actionType === policy.actionType &&
        p.maxAmount.currency_code === currency &&
        parseFloat(p.maxAmount.value) < minValue &&
        parseFloat(p.maxAmount.value) >= amountValue
      );
      if (lowerPolicy) {
        return this.evaluate({ ...context, actionType: lowerPolicy.actionType });
      }
    }

    const decision: PolicyDecision = {
      allowed: true,
      requiresApproval: policy.requiresApproval,
      reason: policy.requiresApproval
        ? `Requires ${policy.approverRoles?.join(' or ') || 'approval'} for ${validatedAmount.value} ${currency}`
        : `Autonomous action allowed per ${policy.id}`,
      policyId: policy.id,
      approverRoles: policy.approverRoles,
      idempotencyKey: generateIdempotencyKey(),
    };

    // Log decision
    this.decisionLog.push(decision);

    return decision;
  }

  /**
   * Find the applicable policy for an action and amount
   */
  private findPolicy(actionType: string, amount: Money): PolicyRule | undefined {
    // Normalize action type for matching (underscores to dashes)
    const normalizedActionType = actionType.replace(/_/g, '-');
    const amountValue = parseFloat(amount.value);

    // First try exact action type match in policy ID with correct amount tier
    // e.g., "create_order" -> match "order" in "approval-order-large" for $15,000
    let policy = this.policies.find(p =>
      p.id.includes(normalizedActionType) &&
      p.maxAmount.currency_code === amount.currency_code &&
      amountValue <= parseFloat(p.maxAmount.value) &&
      (!p.minAmount || amountValue >= parseFloat(p.minAmount.value))
    );

    // If not found, try matching partial keywords with amount filtering
    if (!policy) {
      const keywords = normalizedActionType.split('-');
      for (const keyword of keywords) {
        policy = this.policies.find(p =>
          p.id.includes(keyword) &&
          p.maxAmount.currency_code === amount.currency_code &&
          amountValue <= parseFloat(p.maxAmount.value) &&
          (!p.minAmount || amountValue >= parseFloat(p.minAmount.value))
        );
        if (policy) break;
      }
    }

    // Fall back to amount-based matching
    if (!policy) {
      policy = this.policies
        .filter(p => p.maxAmount.currency_code === amount.currency_code)
        .sort((a, b) => parseFloat(a.maxAmount.value) - parseFloat(b.maxAmount.value))
        .find(p => amountValue <= parseFloat(p.maxAmount.value) && (!p.minAmount || amountValue >= parseFloat(p.minAmount.value)));
    }

    return policy;
  }

  /**
   * Request approval for an action that requires it
   */
  requestApproval(context: PolicyContext, decision: PolicyDecision): ApprovalRequest {
    if (!decision.requiresApproval) {
      throw new Error('Approval not required for this action');
    }

    const approvalRequest: ApprovalRequest = {
      id: generateIdempotencyKey(),
      policyId: decision.policyId,
      context,
      requestedAt: new Date(),
      status: 'pending',
    };

    this.approvalRequests.set(approvalRequest.id, approvalRequest);
    return approvalRequest;
  }

  /**
   * Process an approval decision
   */
  processApproval(approvalId: string, approverId: string, approved: boolean, reason?: string): ApprovalRequest {
    const request = this.approvalRequests.get(approvalId);
    if (!request) {
      throw new Error(`Approval request not found: ${approvalId}`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Approval request already ${request.status}`);
    }

    // Verify approver has correct role
    const policy = this.policies.find(p => p.id === request.policyId);
    if (policy?.approverRoles && !policy.approverRoles.includes(approverId)) {
      throw new Error(`Approver ${approverId} not authorized for ${policy.id}. Required: ${policy.approverRoles.join(', ')}`);
    }

    request.status = approved ? 'approved' : 'rejected';
    request.approvedBy = approverId;
    request.approvedAt = new Date();
    request.rejectionReason = reason;

    return request;
  }

  /**
   * Execute an approved action and record in ledger
   */
  async executeAction(
    context: PolicyContext,
    decision: PolicyDecision,
    executeFn: () => Promise<{ transactionId: string; success: boolean; details?: unknown }>
  ): Promise<{ success: boolean; transactionId?: string; ledgerEntry?: string; error?: string }> {
    // Verify decision is still valid
    if (!decision.allowed) {
      return { success: false, error: decision.reason };
    }

    if (decision.requiresApproval) {
      // Check if approval exists and is approved
      const approval = Array.from(this.approvalRequests.values()).find(
        a => a.policyId === decision.policyId &&
          a.context.actionType === context.actionType &&
          a.status === 'approved'
      );

      if (!approval) {
        return { success: false, error: 'Approval required but not granted' };
      }
    }

    try {
      // Execute the action
      const result = await executeFn();

      if (!result.success) {
        return { success: false, error: 'Action execution failed' };
      }

      // Record in ledger
      const ledgerEntry = this.recordInLedger(context, decision, result.transactionId);

      return {
        success: true,
        transactionId: result.transactionId,
        ledgerEntry: ledgerEntry.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Record successful action in ledger
   */
  private recordInLedger(context: PolicyContext, decision: PolicyDecision, transactionId: string): LedgerEntry {
    const amount = validateMoney({ currency_code: context.currency, value: context.amount.value });

    // Determine ledger transaction type based on action
    let type: 'payment_received' | 'payment_sent' | 'refund' | 'fee' | 'dispute' | 'payout' = 'payment_sent';

    if (context.actionType.includes('invoice') || context.actionType.includes('pay')) {
      type = 'payment_sent';
    } else if (context.actionType.includes('order') || context.actionType.includes('create')) {
      type = 'payment_received';
    } else if (context.actionType.includes('refund')) {
      type = 'refund';
    } else if (context.actionType.includes('payout') || context.actionType.includes('withdraw')) {
      type = 'payout';
    } else if (context.actionType.includes('fee')) {
      type = 'fee';
    } else if (context.actionType.includes('dispute')) {
      type = 'dispute';
    }

    const transaction = createPayPalTransaction(
      transactionId,
      type,
      amount,
      `${context.actionType} - ${decision.reason}`,
      { policyId: decision.policyId, idempotencyKey: decision.idempotencyKey, ...context.metadata }
    );

    return transaction.entries[0];
  }

  /**
   * Get all pending approval requests
   */
  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.approvalRequests.values()).filter(a => a.status === 'pending');
  }

  /**
   * Get approval request by ID
   */
  getApprovalRequest(id: string): ApprovalRequest | undefined {
    return this.approvalRequests.get(id);
  }

  /**
   * Get decision log
   */
  getDecisionLog(): PolicyDecision[] {
    return [...this.decisionLog];
  }

  /**
   * Add custom policy
   */
  addPolicy(policy: PolicyRule): void {
    this.policies.push(policy);
  }

  /**
   * Remove policy
   */
  removePolicy(policyId: string): boolean {
    const index = this.policies.findIndex(p => p.id === policyId);
    if (index >= 0) {
      this.policies.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Verify ledger integrity after actions
   */
  verifyIntegrity(): { valid: boolean; errors: string[] } {
    return this.ledger.verifyIntegrity();
  }

  /**
   * Reset verifier state (for testing)
   */
  reset(): void {
    this.approvalRequests.clear();
    this.decisionLog = [];
    this.ledger.clear();
  }
}

// Singleton instance
let verifierInstance: PolicyLedgerVerifier | null = null;

export function getPolicyVerifier(policies?: PolicyRule[]): PolicyLedgerVerifier {
  if (!verifierInstance) {
    verifierInstance = new PolicyLedgerVerifier(policies);
  }
  return verifierInstance;
}

export function resetPolicyVerifier(): void {
  verifierInstance = null;
}

/**
 * Convenience function to evaluate and execute in one call
 */
export async function evaluateAndExecute(
  context: PolicyContext,
  executeFn: () => Promise<{ transactionId: string; success: boolean }>
): Promise<{ success: boolean; decision: PolicyDecision; result: { transactionId?: string; error?: string } }> {
  const verifier = getPolicyVerifier();
  const decision = verifier.evaluate(context);

  if (!decision.allowed) {
    return { success: false, decision, result: { error: decision.reason } };
  }

  if (decision.requiresApproval) {
    // Auto-create approval request for tracking
    const approval = verifier.requestApproval(context, decision);
    return {
      success: false,
      decision,
      result: { error: `Approval required. Request ID: ${approval.id}. Required roles: ${decision.approverRoles?.join(', ')}` },
    };
  }

  const result = await verifier.executeAction(context, decision, executeFn);
  return { success: result.success, decision, result };
}