import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  runAllInvariants,
  assertSchemaValidation,
  assertLedgerBalance,
  assertPolicyCap,
  assertIdempotencyKey,
  assertZeroSecretLeakage,
  assertAmountPrecision,
  assertInvoiceNumberUnique,
  assertOrderIntentConsistency,
  assertSubscriptionCycleConsistency,
  assertDisputeEvidenceDeadline,
  assertCurrencyConsistency,
  generateIdempotencyKey,
  validateIdempotencyKey,
  validateMoney,
  validateInvoice,
  validateOrder,
  type LedgerEntry,
  type Money,
  type Invoice,
  type Order,
} from './invariants';
import { DoubleEntryLedger, getLedger, resetLedger, createPayPalTransaction, ACCOUNTS } from './ledger';
import { PolicyLedgerVerifier, getPolicyVerifier, resetPolicyVerifier, DEFAULT_POLICIES, evaluateAndExecute } from './policy';

describe('PayPal Integration Invariants', () => {
  beforeEach(() => {
    resetLedger();
    resetPolicyVerifier();
    vi.clearAllMocks();
  });

  describe('1. Schema Validation Invariants', () => {
    it('should validate money schema correctly', () => {
      const money = validateMoney({ currency_code: 'USD', value: '100.00' });
      expect(money.currency_code).toBe('USD');
      expect(money.value).toBe('100.00');
    });

    it('should reject invalid currency code', () => {
      expect(() => validateMoney({ currency_code: 'US', value: '100' })).toThrow();
    });

    it('should reject invalid amount format', () => {
      expect(() => validateMoney({ currency_code: 'USD', value: '100.000' })).toThrow();
    });

    it('should validate invoice schema', () => {
      const invoice: Invoice = {
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
        }],
      };
      const parsed = validateInvoice(invoice);
      expect(parsed.status).toBe('DRAFT');
    });

    it('should validate order schema', () => {
      const order: Order = {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: '100.00',
          },
        }],
      };
      const parsed = validateOrder(order);
      expect(parsed.intent).toBe('CAPTURE');
    });

    it('should generate valid UUID v4 idempotency keys', () => {
      const key = generateIdempotencyKey();
      expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(() => validateIdempotencyKey(key)).not.toThrow();
    });
  });

  describe('2. Double-Entry Ledger Balance Invariant', () => {
    it('should enforce balanced debits and credits', () => {
      const entries: LedgerEntry[] = [
        { account: 'sales', debit: { currency_code: 'USD', value: '100.00' }, credit: { currency_code: 'USD', value: '0.00' } },
        { account: 'cash', debit: { currency_code: 'USD', value: '0.00' }, credit: { currency_code: 'USD', value: '100.00' } },
      ];
      expect(() => assertLedgerBalance(entries)).not.toThrow();
    });

    it('should reject unbalanced entries', () => {
      const entries: LedgerEntry[] = [
        { account: 'sales', debit: { currency_code: 'USD', value: '100.00' }, credit: { currency_code: 'USD', value: '0.00' } },
        { account: 'cash', debit: { currency_code: 'USD', value: '0.00' }, credit: { currency_code: 'USD', value: '50.00' } },
      ];
      expect(() => assertLedgerBalance(entries)).toThrow('Ledger imbalance');
    });

    it('should reject mixed currencies', () => {
      const entries: LedgerEntry[] = [
        { account: 'sales', debit: { currency_code: 'USD', value: '100.00' }, credit: { currency_code: 'USD', value: '0.00' } },
        { account: 'cash', debit: { currency_code: 'EUR', value: '0.00' }, credit: { currency_code: 'EUR', value: '100.00' } },
      ];
      expect(() => assertLedgerBalance(entries)).toThrow('Mixed currencies');
    });

    it('should create balanced transactions in ledger', () => {
      const ledger = getLedger();
      const transaction = ledger.createTransaction('txn-1', [
        { account: ACCOUNTS.PAYPAL_BALANCE, debit: { currency_code: 'USD', value: '0.00' }, credit: { currency_code: 'USD', value: '100.00' }, description: 'Payment received' },
        { account: ACCOUNTS.SALES_REVENUE, debit: { currency_code: 'USD', value: '100.00' }, credit: { currency_code: 'USD', value: '0.00' }, description: 'Revenue recognized' },
      ], 'Test payment');

      expect(transaction.entries).toHaveLength(2);
      const { valid } = ledger.verifyIntegrity();
      expect(valid).toBe(true);
    });

    it('should calculate account balances correctly', () => {
      const ledger = getLedger();
      ledger.createTransaction('txn-1', [
        { account: ACCOUNTS.PAYPAL_BALANCE, debit: { currency_code: 'USD', value: '0.00' }, credit: { currency_code: 'USD', value: '100.00' }, description: 'Payment received' },
        { account: ACCOUNTS.SALES_REVENUE, debit: { currency_code: 'USD', value: '100.00' }, credit: { currency_code: 'USD', value: '0.00' }, description: 'Revenue recognized' },
      ], 'Test payment');

      const balance = ledger.getAccountBalance(ACCOUNTS.PAYPAL_BALANCE);
      expect(balance.value).toBe('100.00');
      expect(balance.currency_code).toBe('USD');

      const revenueBalance = ledger.getAccountBalance(ACCOUNTS.SALES_REVENUE);
      expect(revenueBalance.value).toBe('-100.00');
    });
  });

  describe('3. Autonomous vs Approval Policy Caps Invariant', () => {
    it('should allow autonomous actions within cap', () => {
      expect(() => assertPolicyCap('autonomous', { currency_code: 'USD', value: '500.00' })).not.toThrow();
    });

    it('should reject autonomous actions exceeding cap', () => {
      expect(() => assertPolicyCap('autonomous', { currency_code: 'USD', value: '1500.00' })).toThrow('exceeds cap');
    });

    it('should allow approval-required actions above autonomous cap', () => {
      expect(() => assertPolicyCap('approval_required', { currency_code: 'USD', value: '15000.00' })).not.toThrow();
    });

    it('should reject approval-required actions within autonomous cap', () => {
      expect(() => assertPolicyCap('approval_required', { currency_code: 'USD', value: '500.00' })).toThrow('within autonomous cap');
    });

    it('should enforce currency consistency in policies', () => {
      expect(() => assertPolicyCap('autonomous', { currency_code: 'EUR', value: '500.00' })).toThrow('Currency mismatch');
    });
  });

  describe('4. PayPal-Request-Id UUID Enforcement Invariant', () => {
    it('should accept valid UUID v4', () => {
      const key = generateIdempotencyKey();
      expect(() => assertIdempotencyKey(key)).not.toThrow();
    });

    it('should reject invalid UUID format', () => {
      expect(() => assertIdempotencyKey('not-a-uuid')).toThrow();
    });

    it('should reject UUID v1', () => {
      expect(() => assertIdempotencyKey('123e4567-e89b-12d3-a456-426614174000')).toThrow('UUID v4');
    });
  });

  describe('5. Zero Secret Leakage Invariant', () => {
    it('should pass for clean logs', () => {
      const logs = [
        { level: 'info', message: 'Order created', metadata: { orderId: '123', amount: '100.00' } },
        { level: 'debug', message: 'API call', metadata: { url: 'https://api.sandbox.paypal.com/v2/checkout/orders' } },
      ];
      expect(() => assertZeroSecretLeakage(logs)).not.toThrow();
    });

    it('should detect potential secret in logs', () => {
      const logs = [
        { level: 'info', message: 'Auth', metadata: { client_secret: 'super-secret-value-12345' } },
      ];
      expect(() => assertZeroSecretLeakage(logs)).toThrow('secret leakage');
    });

    it('should detect access_token in logs', () => {
      const logs = [
        { level: 'debug', message: 'Token', metadata: { access_token: 'A21AAH5...longtoken...' } },
      ];
      expect(() => assertZeroSecretLeakage(logs)).toThrow('secret leakage');
    });
  });

  describe('6. Amount Precision Invariant', () => {
    it('should accept amounts with 2 decimal places', () => {
      expect(() => assertAmountPrecision({ currency_code: 'USD', value: '100.00' })).not.toThrow();
      expect(() => assertAmountPrecision({ currency_code: 'USD', value: '100.50' })).not.toThrow();
      expect(() => assertAmountPrecision({ currency_code: 'USD', value: '100' })).not.toThrow();
    });

    it('should reject amounts with more than 2 decimal places', () => {
      expect(() => assertAmountPrecision({ currency_code: 'USD', value: '100.001' })).toThrow('exceeds 2 decimal places');
    });

    it('should reject non-numeric amounts', () => {
      expect(() => assertAmountPrecision({ currency_code: 'USD', value: 'abc' })).toThrow('not a valid number');
    });
  });

  describe('7. Invoice Number Uniqueness Invariant', () => {
    it('should pass for unique invoice numbers', () => {
      expect(() => assertInvoiceNumberUnique(['INV-001', 'INV-002', 'INV-003'])).not.toThrow();
    });

    it('should reject duplicate invoice numbers', () => {
      expect(() => assertInvoiceNumberUnique(['INV-001', 'INV-002', 'INV-001'])).toThrow('Duplicate invoice numbers');
    });
  });

  describe('8. Order Intent Consistency Invariant', () => {
    it('should require CAPTURE for immediate payments', () => {
      const order: Order = {
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: 'USD', value: '100.00' } }],
      };
      expect(() => assertOrderIntentConsistency(order, 'immediate')).not.toThrow();
    });

    it('should require AUTHORIZE for delayed payments', () => {
      const order: Order = {
        intent: 'AUTHORIZE',
        purchase_units: [{ amount: { currency_code: 'USD', value: '100.00' } }],
      };
      expect(() => assertOrderIntentConsistency(order, 'delayed')).not.toThrow();
    });

    it('should reject mismatched intent', () => {
      const order: Order = {
        intent: 'AUTHORIZE',
        purchase_units: [{ amount: { currency_code: 'USD', value: '100.00' } }],
      };
      expect(() => assertOrderIntentConsistency(order, 'immediate')).toThrow('requires CAPTURE intent');
    });
  });

  describe('9. Subscription Cycle Consistency Invariant', () => {
    it('should pass for sequential cycles', () => {
      const plan = {
        product_id: 'PROD-123',
        name: 'Monthly Plan',
        billing_cycles: [
          { frequency: { interval_unit: 'MONTH' as const, interval_count: 1 }, tenure_type: 'TRIAL' as const, sequence: 1, total_cycles: 3, pricing_scheme: { fixed_price: { currency_code: 'USD', value: '0.00' } } },
          { frequency: { interval_unit: 'MONTH' as const, interval_count: 1 }, tenure_type: 'REGULAR' as const, sequence: 2, pricing_scheme: { fixed_price: { currency_code: 'USD', value: '29.99' } } },
        ],
      };
      expect(() => assertSubscriptionCycleConsistency(plan)).not.toThrow();
    });

    it('should reject non-sequential cycles', () => {
      const plan = {
        product_id: 'PROD-123',
        name: 'Monthly Plan',
        billing_cycles: [
          { frequency: { interval_unit: 'MONTH' as const, interval_count: 1 }, tenure_type: 'TRIAL' as const, sequence: 1, total_cycles: 3, pricing_scheme: { fixed_price: { currency_code: 'USD', value: '0.00' } } },
          { frequency: { interval_unit: 'MONTH' as const, interval_count: 1 }, tenure_type: 'REGULAR' as const, sequence: 3, pricing_scheme: { fixed_price: { currency_code: 'USD', value: '29.99' } } },
        ],
      };
      expect(() => assertSubscriptionCycleConsistency(plan)).toThrow('sequence gap');
    });

    it('should reject consecutive trial cycles', () => {
      const plan = {
        product_id: 'PROD-123',
        name: 'Monthly Plan',
        billing_cycles: [
          { frequency: { interval_unit: 'MONTH' as const, interval_count: 1 }, tenure_type: 'TRIAL' as const, sequence: 1, total_cycles: 3, pricing_scheme: { fixed_price: { currency_code: 'USD', value: '0.00' } } },
          { frequency: { interval_unit: 'MONTH' as const, interval_count: 1 }, tenure_type: 'TRIAL' as const, sequence: 2, pricing_scheme: { fixed_price: { currency_code: 'USD', value: '0.00' } } },
        ],
      };
      expect(() => assertSubscriptionCycleConsistency(plan)).toThrow('Consecutive trial cycles');
    });
  });

  describe('10. Dispute Evidence Deadline Invariant', () => {
    it('should pass when evidence submitted before deadline', () => {
      expect(() => assertDisputeEvidenceDeadline('2026-02-01T00:00:00Z', '2026-01-30T12:00:00Z')).not.toThrow();
    });

    it('should reject evidence submitted after deadline', () => {
      expect(() => assertDisputeEvidenceDeadline('2026-01-30T00:00:00Z', '2026-02-01T12:00:00Z')).toThrow('after deadline');
    });
  });

  describe('11. Currency Consistency Invariant', () => {
    it('should pass for same currency', () => {
      expect(() => assertCurrencyConsistency([
        { currency_code: 'USD', value: '100.00' },
        { currency_code: 'USD', value: '50.00' },
      ])).not.toThrow();
    });

    it('should reject mixed currencies', () => {
      expect(() => assertCurrencyConsistency([
        { currency_code: 'USD', value: '100.00' },
        { currency_code: 'EUR', value: '50.00' },
      ])).toThrow('Currency mismatch');
    });
  });

  describe('12. Policy Ledger Verifier Integration', () => {
    it('should evaluate autonomous action within cap', () => {
      const verifier = getPolicyVerifier();
      const decision = verifier.evaluate({
        actionType: 'pay_invoice',
        amount: { currency_code: 'USD', value: '500.00' },
        currency: 'USD',
      });

      expect(decision.allowed).toBe(true);
      expect(decision.requiresApproval).toBe(false);
      expect(decision.policyId).toBe('auto-pay-invoice');
    });

    it('should require approval for large orders', () => {
      const verifier = getPolicyVerifier();
      const decision = verifier.evaluate({
        actionType: 'create_order',
        amount: { currency_code: 'USD', value: '15000.00' },
        currency: 'USD',
      });

      expect(decision.allowed).toBe(true);
      expect(decision.requiresApproval).toBe(true);
      expect(decision.approverRoles).toContain('director');
    });

    it('should reject amounts exceeding all policy caps', () => {
      const verifier = getPolicyVerifier();
      const decision = verifier.evaluate({
        actionType: 'create_order',
        amount: { currency_code: 'USD', value: '2000000.00' },
        currency: 'USD',
      });

      expect(decision.allowed).toBe(false);
    });

    it('should create approval request for approval-required actions', () => {
      const verifier = getPolicyVerifier();
      const decision = verifier.evaluate({
        actionType: 'create_order',
        amount: { currency_code: 'USD', value: '15000.00' },
        currency: 'USD',
      });

      const approval = verifier.requestApproval({
        actionType: 'create_order',
        amount: { currency_code: 'USD', value: '15000.00' },
        currency: 'USD',
      }, decision);

      expect(approval.status).toBe('pending');
      expect(approval.policyId).toBe(decision.policyId);
    });

    it('should process approval with valid approver', () => {
      const verifier = getPolicyVerifier();
      const decision = verifier.evaluate({
        actionType: 'create_order',
        amount: { currency_code: 'USD', value: '15000.00' },
        currency: 'USD',
      });

      const approval = verifier.requestApproval({
        actionType: 'create_order',
        amount: { currency_code: 'USD', value: '15000.00' },
        currency: 'USD',
      }, decision);

      const processed = verifier.processApproval(approval.id, 'director', true);
      expect(processed.status).toBe('approved');
      expect(processed.approvedBy).toBe('director');
    });

    it('should reject approval from unauthorized role', () => {
      const verifier = getPolicyVerifier();
      const decision = verifier.evaluate({
        actionType: 'create_order',
        amount: { currency_code: 'USD', value: '15000.00' },
        currency: 'USD',
      });

      const approval = verifier.requestApproval({
        actionType: 'create_order',
        amount: { currency_code: 'USD', value: '15000.00' },
        currency: 'USD',
      }, decision);

      expect(() => verifier.processApproval(approval.id, 'intern', true)).toThrow('not authorized');
    });

    it('should execute action and record in ledger', async () => {
      const verifier = getPolicyVerifier();
      const decision = verifier.evaluate({
        actionType: 'pay_invoice',
        amount: { currency_code: 'USD', value: '500.00' },
        currency: 'USD',
      });

      const result = await verifier.executeAction(
        { actionType: 'pay_invoice', amount: { currency_code: 'USD', value: '500.00' }, currency: 'USD' },
        decision,
        async () => ({ transactionId: 'txn-123', success: true })
      );

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('txn-123');
      expect(result.ledgerEntry).toBeDefined();

      // Verify ledger integrity
      const { valid } = verifier.verifyIntegrity();
      expect(valid).toBe(true);
    });

    it('should run evaluateAndExecute convenience function', async () => {
      const result = await evaluateAndExecute(
        { actionType: 'pay_invoice', amount: { currency_code: 'USD', value: '500.00' }, currency: 'USD' },
        async () => ({ transactionId: 'txn-456', success: true })
      );

      expect(result.success).toBe(true);
      expect(result.decision.allowed).toBe(true);
      expect(result.decision.requiresApproval).toBe(false);
    });
  });

  describe('13. PayPal Transaction Helpers', () => {
    it('should create payment_received transaction', () => {
      const transaction = createPayPalTransaction('txn-1', 'payment_received', { currency_code: 'USD', value: '100.00' }, 'Invoice payment');
      expect(transaction.entries).toHaveLength(2);
      expect(transaction.entries[0].account).toBe(ACCOUNTS.PAYPAL_BALANCE);
      expect(transaction.entries[1].account).toBe(ACCOUNTS.SALES_REVENUE);
    });

    it('should create refund transaction', () => {
      const transaction = createPayPalTransaction('txn-2', 'refund', { currency_code: 'USD', value: '50.00' }, 'Partial refund');
      expect(transaction.entries).toHaveLength(2);
      expect(transaction.entries[0].account).toBe(ACCOUNTS.PAYPAL_BALANCE);
      expect(transaction.entries[1].account).toBe(ACCOUNTS.REFUNDS);
    });

    it('should create payout transaction', () => {
      const transaction = createPayPalTransaction('txn-3', 'payout', { currency_code: 'USD', value: '1000.00' }, 'Bank withdrawal');
      expect(transaction.entries).toHaveLength(2);
      expect(transaction.entries[0].account).toBe(ACCOUNTS.PAYPAL_BALANCE);
      expect(transaction.entries[1].account).toBe(ACCOUNTS.BANK_ACCOUNT);
    });
  });

  describe('14. Run All Invariants', () => {
    it('should pass all invariants without throwing', () => {
      expect(() => runAllInvariants()).not.toThrow();
    });
  });
});