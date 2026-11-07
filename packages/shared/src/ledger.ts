import { Money, MoneySchema, validateMoney } from './schema';
import { z } from 'zod';

/**
 * Double-Entry Ledger Implementation
 * Enforces: sum(debits) === sum(credits) for every transaction
 */

export interface LedgerEntry {
  id: string;
  transactionId: string;
  account: string;
  debit: Money;
  credit: Money;
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface Transaction {
  id: string;
  entries: LedgerEntry[];
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export class DoubleEntryLedger {
  private transactions: Map<string, Transaction> = new Map();
  private entries: Map<string, LedgerEntry> = new Map();

  /**
   * Create a new transaction with balanced entries
   * Throws if debits don't equal credits
   */
  createTransaction(
    transactionId: string,
    entries: Omit<LedgerEntry, 'id' | 'transactionId' | 'timestamp'>[],
    description: string,
    metadata?: Record<string, unknown>
  ): Transaction {
    // Validate all amounts
    const validatedEntries = entries.map(e => ({
      ...e,
      debit: validateMoney(e.debit),
      credit: validateMoney(e.credit),
    }));

    // Check balance
    const totalDebits = validatedEntries.reduce((sum, e) => sum + parseFloat(e.debit.value), 0);
    const totalCredits = validatedEntries.reduce((sum, e) => sum + parseFloat(e.credit.value), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(
        `Transaction ${transactionId} unbalanced: debits=${totalDebits}, credits=${totalCredits}`
      );
    }

    // Check currency consistency
    const currencies = new Set(validatedEntries.flatMap(e => [e.debit.currency_code, e.credit.currency_code]));
    if (currencies.size > 1) {
      throw new Error(`Mixed currencies in transaction: ${Array.from(currencies).join(', ')}`);
    }

    const timestamp = new Date();
    const ledgerEntries: LedgerEntry[] = validatedEntries.map((e, i) => ({
      id: `${transactionId}-${i}`,
      transactionId,
      ...e,
      timestamp,
    }));

    const transaction: Transaction = {
      id: transactionId,
      entries: ledgerEntries,
      description,
      timestamp,
      metadata,
    };

    this.transactions.set(transactionId, transaction);
    ledgerEntries.forEach(entry => this.entries.set(entry.id, entry));

    return transaction;
  }

  /**
   * Get transaction by ID
   */
  getTransaction(transactionId: string): Transaction | undefined {
    return this.transactions.get(transactionId);
  }

  /**
   * Get all entries for an account
   */
  getAccountEntries(account: string): LedgerEntry[] {
    return Array.from(this.entries.values()).filter(e => e.account === account);
  }

  /**
   * Get account balance
   */
  getAccountBalance(account: string): Money {
    const entries = this.getAccountEntries(account);
    const currency = entries[0]?.debit.currency_code || 'USD';

    let balance = 0;
    for (const entry of entries) {
      balance += parseFloat(entry.credit.value) - parseFloat(entry.debit.value);
    }

    return { currency_code: currency, value: balance.toFixed(2) };
  }

  /**
   * Get trial balance (all accounts)
   */
  getTrialBalance(): Map<string, Money> {
    const accounts = new Set(Array.from(this.entries.values()).map(e => e.account));
    const balances = new Map<string, Money>();

    for (const account of accounts) {
      balances.set(account, this.getAccountBalance(account));
    }

    return balances;
  }

  /**
   * Verify ledger integrity
   */
  verifyIntegrity(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const transaction of this.transactions.values()) {
      const totalDebits = transaction.entries.reduce((sum, e) => sum + parseFloat(e.debit.value), 0);
      const totalCredits = transaction.entries.reduce((sum, e) => sum + parseFloat(e.credit.value), 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        errors.push(`Transaction ${transaction.id} unbalanced: ${totalDebits} != ${totalCredits}`);
      }
    }

    // Check total debits = total credits across all transactions
    const allDebits = Array.from(this.entries.values()).reduce((sum, e) => sum + parseFloat(e.debit.value), 0);
    const allCredits = Array.from(this.entries.values()).reduce((sum, e) => sum + parseFloat(e.credit.value), 0);

    if (Math.abs(allDebits - allCredits) > 0.01) {
      errors.push(`Global ledger imbalance: ${allDebits} != ${allCredits}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.transactions.clear();
    this.entries.clear();
  }

  /**
   * Get all ledger entries
   */
  getAllEntries(): LedgerEntry[] {
    return Array.from(this.entries.values());
  }
}

// Singleton instance
let ledgerInstance: DoubleEntryLedger | null = null;

export function getLedger(): DoubleEntryLedger {
  if (!ledgerInstance) {
    ledgerInstance = new DoubleEntryLedger();
  }
  return ledgerInstance;
}

export function resetLedger(): void {
  ledgerInstance = null;
}

/**
 * Common account names for PayPal operations
 */
export const ACCOUNTS = {
  PAYPAL_BALANCE: 'paypal_balance',
  BANK_ACCOUNT: 'bank_account',
  SALES_REVENUE: 'sales_revenue',
  REFUNDS: 'refunds',
  FEES: 'fees',
  DISPUTES: 'disputes',
  HOLDING: 'holding',
  ACCOUNTS_RECEIVABLE: 'accounts_receivable',
  ACCOUNTS_PAYABLE: 'accounts_payable',
} as const;

/**
 * Helper to create standard PayPal transaction entries
 */
export function createPayPalTransaction(
  transactionId: string,
  type: 'payment_received' | 'payment_sent' | 'refund' | 'fee' | 'dispute' | 'payout',
  amount: Money,
  description: string,
  metadata?: Record<string, unknown>
): Transaction {
  const ledger = getLedger();

  switch (type) {
    case 'payment_received':
      return ledger.createTransaction(transactionId, [
        { account: ACCOUNTS.PAYPAL_BALANCE, debit: { currency_code: amount.currency_code, value: '0.00' }, credit: amount, description: `Payment received: ${description}` },
        { account: ACCOUNTS.SALES_REVENUE, debit: amount, credit: { currency_code: amount.currency_code, value: '0.00' }, description: `Revenue recognized: ${description}` },
      ], description, metadata);

    case 'payment_sent':
      return ledger.createTransaction(transactionId, [
        { account: ACCOUNTS.PAYPAL_BALANCE, debit: amount, credit: { currency_code: amount.currency_code, value: '0.00' }, description: `Payment sent: ${description}` },
        { account: ACCOUNTS.ACCOUNTS_PAYABLE, debit: { currency_code: amount.currency_code, value: '0.00' }, credit: amount, description: `Payable recorded: ${description}` },
      ], description, metadata);

    case 'refund':
      return ledger.createTransaction(transactionId, [
        { account: ACCOUNTS.PAYPAL_BALANCE, debit: amount, credit: { currency_code: amount.currency_code, value: '0.00' }, description: `Refund issued: ${description}` },
        { account: ACCOUNTS.REFUNDS, debit: { currency_code: amount.currency_code, value: '0.00' }, credit: amount, description: `Refund expense: ${description}` },
      ], description, metadata);

    case 'fee':
      return ledger.createTransaction(transactionId, [
        { account: ACCOUNTS.PAYPAL_BALANCE, debit: amount, credit: { currency_code: amount.currency_code, value: '0.00' }, description: `Fee charged: ${description}` },
        { account: ACCOUNTS.FEES, debit: { currency_code: amount.currency_code, value: '0.00' }, credit: amount, description: `Fee expense: ${description}` },
      ], description, metadata);

    case 'dispute':
      return ledger.createTransaction(transactionId, [
        { account: ACCOUNTS.PAYPAL_BALANCE, debit: amount, credit: { currency_code: amount.currency_code, value: '0.00' }, description: `Dispute hold: ${description}` },
        { account: ACCOUNTS.DISPUTES, debit: { currency_code: amount.currency_code, value: '0.00' }, credit: amount, description: `Dispute liability: ${description}` },
      ], description, metadata);

    case 'payout':
      return ledger.createTransaction(transactionId, [
        { account: ACCOUNTS.PAYPAL_BALANCE, debit: amount, credit: { currency_code: amount.currency_code, value: '0.00' }, description: `Payout to bank: ${description}` },
        { account: ACCOUNTS.BANK_ACCOUNT, debit: { currency_code: amount.currency_code, value: '0.00' }, credit: amount, description: `Bank deposit: ${description}` },
      ], description, metadata);

    default:
      throw new Error(`Unknown transaction type: ${type}`);
  }
}