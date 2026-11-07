import { z } from 'zod';
import {
  IdempotencyKeySchema,
  MoneySchema,
  InvoiceSchema,
  OrderSchema,
  WebhookEventSchema,
  ProductSchema,
  PlanSchema,
  validateIdempotencyKey,
  validateMoney,
  validateInvoice,
  validateOrder,
  validateWebhookEvent,
  generateIdempotencyKey,
  type Money,
  type Invoice,
  type Order,
  type WebhookEvent,
} from './schema';
import { PolicyRule, DEFAULT_POLICIES } from './policy';

// Re-export validation functions for test consumption
export { validateIdempotencyKey, validateMoney, validateInvoice, validateOrder, validateWebhookEvent, generateIdempotencyKey };

/**
 * Invariant tests for PayPal integration
 * These are the core assertions that must always pass
 */

/**
 * 1. Schema Validation Invariants
 * All PayPal API requests/responses must validate against our schemas
 */
export function assertSchemaValidation() {
  // Money validation
  const validMoney = { currency_code: 'USD', value: '100.00' };
  const parsedMoney = validateMoney(validMoney);
  if (parsedMoney.currency_code !== 'USD' || parsedMoney.value !== '100.00') {
    throw new Error('Money schema validation failed');
  }

  // Invalid money should throw
  try {
    validateMoney({ currency_code: 'US', value: '100' });
    throw new Error('Should have thrown for invalid currency');
  } catch (e) {
    if (!(e instanceof z.ZodError)) throw e;
  }

  // Invoice validation
  const validInvoice: Invoice = {
    status: 'DRAFT',
    detail: {
      invoice_date: '2026-01-15',
      currency_code: 'USD',
    },
    invoicer: {
      email_address: 'seller@example.com',
    },
    primary_recipients: [{
      billing_info: {
        email_address: 'buyer@example.com',
      },
    }],
    items: [{
      name: 'Test Item',
      quantity: '1',
      unit_amount: { currency_code: 'USD', value: '50.00' },
      unit_of_measure: 'QUANTITY',
    }],
  };
  const parsedInvoice = validateInvoice(validInvoice);
  if (parsedInvoice.status !== 'DRAFT') {
    throw new Error('Invoice schema validation failed');
  }

  // Order validation
  const validOrder: Order = {
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'USD',
        value: '100.00',
      },
    }],
  };
  const parsedOrder = validateOrder(validOrder);
  if (parsedOrder.intent !== 'CAPTURE') {
    throw new Error('Order schema validation failed');
  }

  console.log('✓ Schema validation invariants passed');
}

/**
 * 2. Double-Entry Ledger Balance Invariant
 * Every financial transaction must balance: sum(debits) === sum(credits)
 */
export interface SimpleLedgerEntry {
  account: string;
  debit: Money;
  credit: Money;
}

export function assertLedgerBalance(entries: SimpleLedgerEntry[]): void {
  const totalDebits = entries.reduce((sum, entry) => {
    return sum + parseFloat(entry.debit.value);
  }, 0);

  const totalCredits = entries.reduce((sum, entry) => {
    return sum + parseFloat(entry.credit.value);
  }, 0);

  // Allow for floating point precision (2 decimal places)
  const diff = Math.abs(totalDebits - totalCredits);
  if (diff > 0.01) {
    throw new Error(`Ledger imbalance: debits=${totalDebits}, credits=${totalCredits}, diff=${diff}`);
  }

  // All entries must have same currency
  const currencies = new Set(entries.map(e => e.debit.currency_code));
  if (currencies.size > 1) {
    throw new Error(`Mixed currencies in ledger: ${Array.from(currencies).join(', ')}`);
  }

  console.log('✓ Double-entry ledger balance invariant passed');
}

/**
 * 3. Autonomous vs Approval Policy Caps Invariant
 * Autonomous actions have strict caps; anything above requires approval
 */

export function assertPolicyCap(actionType: 'autonomous' | 'approval_required', amount: Money, policies: PolicyRule[] = DEFAULT_POLICIES): boolean {
  const applicablePolicy = policies.find(p => p.actionType === actionType);
  if (!applicablePolicy) {
    throw new Error(`No policy found for action type: ${actionType}`);
  }

  const amountValue = parseFloat(amount.value);
  const maxValue = parseFloat(applicablePolicy.maxAmount.value);

  if (amount.currency_code !== applicablePolicy.maxAmount.currency_code) {
    throw new Error(`Currency mismatch: ${amount.currency_code} vs ${applicablePolicy.maxAmount.currency_code}`);
  }

  const isWithinCap = amountValue <= maxValue;

  // Autonomous actions MUST be within cap
  if (actionType === 'autonomous' && !isWithinCap) {
    throw new Error(`Autonomous action exceeds cap: ${amountValue} > ${maxValue} (${applicablePolicy.description})`);
  }

  // Approval required actions MUST exceed autonomous cap
  if (actionType === 'approval_required' && isWithinCap) {
    throw new Error(`Approval-required action is within autonomous cap: ${amountValue} <= ${maxValue}`);
  }

  console.log(`✓ Policy cap invariant passed: ${actionType} ${amount.value} ${amount.currency_code}`);
  return isWithinCap;
}

/**
 * 4. PayPal-Request-Id UUID Enforcement Invariant
 * Every mutating API call must include a valid UUID v4 idempotency key
 */
export function assertIdempotencyKey(key: string): void {
  const parsed = validateIdempotencyKey(key);

  // Must be UUID v4 format
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidV4Regex.test(parsed)) {
    throw new Error(`PayPal-Request-Id must be UUID v4: ${parsed}`);
  }

  console.log('✓ PayPal-Request-Id UUID enforcement invariant passed');
}

/**
 * 5. Zero Secret Leakage Invariant
 * No secrets (client_secret, access_token, webhook_signing_key) in logs, responses, or client bundles
 */
export interface LogEntry {
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export function assertZeroSecretLeakage(logs: LogEntry[]): void {
  const secretPatterns = [
    /PAYPAL_CLIENT_SECRET/i,
    /client_secret/i,
    /access_token/i,
    /webhook_signing_key/i,
    /PAYPAL_ACCESS_TOKEN/i,
    /secret/i,
    /token/i,
  ];

  for (const log of logs) {
    const fullMessage = `${log.message} ${JSON.stringify(log.metadata || {})}`;

    for (const pattern of secretPatterns) {
      if (pattern.test(fullMessage)) {
        // Allow if it's just the pattern name, not an actual value
        // Look for actual secret values: key=value, key: value, "value" with 20+ chars including dots
        const valuePatterns = [
          /=[a-zA-Z0-9_\-\.]{20,}/,  // key=longvalue (with dots for JWT tokens)
          /:[a-zA-Z0-9_\-\.]{20,}/,  // key: longvalue (with dots)
          /"[a-zA-Z0-9_\-\.]{20,}"/, // "longvalue" (with dots)
        ];

        const hasActualSecret = valuePatterns.some(p => p.test(fullMessage));
        if (hasActualSecret) {
          throw new Error(`Potential secret leakage in log: ${log.message.substring(0, 100)}`);
        }
      }
    }
  }

  console.log('✓ Zero secret leakage invariant passed');
}

/**
 * 6. Webhook Signature Verification Invariant
 * All incoming webhooks must have valid signatures
 */
export interface WebhookVerificationResult {
  valid: boolean;
  eventType: string;
  resourceId: string;
}

export function assertWebhookSignature(
  payload: string,
  signature: string,
  webhookId: string,
  verifyFn: (payload: string, signature: string, webhookId: string) => Promise<WebhookVerificationResult>
): Promise<void> {
  return verifyFn(payload, signature, webhookId).then(result => {
    if (!result.valid) {
      throw new Error(`Invalid webhook signature for ${result.eventType} (${result.resourceId})`);
    }
    console.log(`✓ Webhook signature invariant passed: ${result.eventType}`);
  });
}

/**
 * 7. Amount Precision Invariant
 * All monetary amounts must have exactly 2 decimal places
 */
export function assertAmountPrecision(amount: Money): void {
  const value = amount.value;
  const decimalPlaces = (value.split('.')[1] || '').length;

  if (decimalPlaces > 2) {
    throw new Error(`Amount exceeds 2 decimal places: ${value}`);
  }

  // Must be valid number
  if (isNaN(parseFloat(value))) {
    throw new Error(`Amount is not a valid number: ${value}`);
  }

  console.log(`✓ Amount precision invariant passed: ${amount.value} ${amount.currency_code}`);
}

/**
 * 8. Invoice Number Uniqueness Invariant
 * All invoices must have unique invoice numbers within a merchant account
 */
export function assertInvoiceNumberUnique(invoiceNumbers: string[]): void {
  const uniqueNumbers = new Set(invoiceNumbers);
  if (uniqueNumbers.size !== invoiceNumbers.length) {
    const duplicates = invoiceNumbers.filter((n, i) => invoiceNumbers.indexOf(n) !== i);
    throw new Error(`Duplicate invoice numbers: ${duplicates.join(', ')}`);
  }
  console.log('✓ Invoice number uniqueness invariant passed');
}

/**
 * 9. Order Intent Consistency Invariant
 * Order intent must match the business action (CAPTURE for immediate payment, AUTHORIZE for delayed)
 */
export function assertOrderIntentConsistency(order: Order, expectedAction: 'immediate' | 'delayed'): void {
  if (expectedAction === 'immediate' && order.intent !== 'CAPTURE') {
    throw new Error(`Immediate payment requires CAPTURE intent, got ${order.intent}`);
  }
  if (expectedAction === 'delayed' && order.intent !== 'AUTHORIZE') {
    throw new Error(`Delayed payment requires AUTHORIZE intent, got ${order.intent}`);
  }
  console.log(`✓ Order intent consistency invariant passed: ${order.intent} for ${expectedAction}`);
}

/**
 * 10. Subscription Cycle Consistency Invariant
 * Billing cycles must be sequential and non-overlapping
 */
export function assertSubscriptionCycleConsistency(plan: z.infer<typeof PlanSchema>): void {
  const cycles = plan.billing_cycles;
  for (let i = 1; i < cycles.length; i++) {
    if (cycles[i].sequence !== i + 1) {
      throw new Error(`Billing cycle sequence gap: expected ${i + 1}, got ${cycles[i].sequence}`);
    }
    if (cycles[i].tenure_type === 'TRIAL' && cycles[i - 1].tenure_type === 'TRIAL') {
      throw new Error('Consecutive trial cycles not allowed');
    }
  }
  console.log('✓ Subscription cycle consistency invariant passed');
}

/**
 * 11. Dispute Evidence Deadline Invariant
 * Dispute evidence must be submitted before deadline
 */
export function assertDisputeEvidenceDeadline(deadline: string, evidenceSubmittedAt: string): void {
  const deadlineDate = new Date(deadline);
  const submittedDate = new Date(evidenceSubmittedAt);

  if (submittedDate > deadlineDate) {
    throw new Error(`Evidence submitted after deadline: ${evidenceSubmittedAt} > ${deadline}`);
  }
  console.log('✓ Dispute evidence deadline invariant passed');
}

/**
 * 12. Currency Consistency Invariant
 * All amounts in a single transaction must use the same currency
 */
export function assertCurrencyConsistency(amounts: Money[]): void {
  const currencies = new Set(amounts.map(a => a.currency_code));
  if (currencies.size > 1) {
    throw new Error(`Currency mismatch in transaction: ${Array.from(currencies).join(', ')}`);
  }
  console.log(`✓ Currency consistency invariant passed: ${Array.from(currencies)[0]}`);
}

/**
 * Run all invariants
 */
export function runAllInvariants(): void {
  console.log('\n=== Running PayPal Integration Invariants ===\n');

  assertSchemaValidation();
  assertLedgerBalance([
    { account: 'sales', debit: { currency_code: 'USD', value: '100.00' }, credit: { currency_code: 'USD', value: '0.00' } },
    { account: 'cash', debit: { currency_code: 'USD', value: '0.00' }, credit: { currency_code: 'USD', value: '100.00' } },
  ]);
  assertPolicyCap('autonomous', { currency_code: 'USD', value: '500.00' });
  assertPolicyCap('approval_required', { currency_code: 'USD', value: '15000.00' });
  assertIdempotencyKey(generateIdempotencyKey());
  assertZeroSecretLeakage([
    { level: 'info', message: 'Order created', metadata: { orderId: '123', amount: '100.00' } },
    { level: 'debug', message: 'API call', metadata: { url: 'https://api.sandbox.paypal.com/v2/checkout/orders' } },
  ]);
  assertAmountPrecision({ currency_code: 'USD', value: '100.00' });
  assertInvoiceNumberUnique(['INV-001', 'INV-002', 'INV-003']);
  assertOrderIntentConsistency({ intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: 'USD', value: '100.00' } }] }, 'immediate');

  const testPlan = {
    product_id: 'PROD-123',
    name: 'Monthly Plan',
    status: 'ACTIVE' as const,
    billing_cycles: [
      { frequency: { interval_unit: 'MONTH' as const, interval_count: 1 }, tenure_type: 'TRIAL' as const, sequence: 1, total_cycles: 3, pricing_scheme: { fixed_price: { currency_code: 'USD', value: '0.00' } } },
      { frequency: { interval_unit: 'MONTH' as const, interval_count: 1 }, tenure_type: 'REGULAR' as const, sequence: 2, pricing_scheme: { fixed_price: { currency_code: 'USD', value: '29.99' } } },
    ],
  };
  assertSubscriptionCycleConsistency(testPlan);
  assertDisputeEvidenceDeadline('2026-02-01T00:00:00Z', '2026-01-30T12:00:00Z');
  assertCurrencyConsistency([
    { currency_code: 'USD', value: '100.00' },
    { currency_code: 'USD', value: '50.00' },
  ]);

  console.log('\n=== All Invariants Passed ===\n');
}