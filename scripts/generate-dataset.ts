// Generate 250-transaction multi-currency dataset with 18 planted anomalies
// Run with: npx tsx scripts/generate-dataset.ts

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Currency configurations
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SGD'] as const;
type Currency = typeof CURRENCIES[number];

const FX_RATES: Record<Currency, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 149.5,
  CHF: 0.88,
  SGD: 1.34,
};

// Helper functions
const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;
const randomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const randomChoice = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const uuid = () => crypto.randomUUID();

// Generate 18 specific anomaly types
const ANOMALY_TYPES = [
  // 1. DOUBLE-ENTRY VIOLATION: Unbalanced debits/credits
  { id: 'A1', type: 'double_entry_violation', table: 'transactions', description: 'Transaction with unbalanced debit/credit' },
  // 2. CURRENCY MISMATCH: Invoice in one currency, payment in another
  { id: 'A2', type: 'currency_mismatch', table: 'invoicePayments', description: 'Payment currency differs from invoice currency' },
  // 3. NEGATIVE INVENTORY: Quantity exceeds available
  { id: 'A3', type: 'negative_inventory', table: 'invoiceItems', description: 'Line item quantity exceeds product inventory' },
  // 4. POLICY CAP EXCEEDED: Autonomous action above $500 cap
  { id: 'A4', type: 'policy_cap_exceeded', table: 'transactions', description: 'Autonomous transaction exceeds $500 cap' },
  // 5. IDENTITY THEFT: Customer email used by different company
  { id: 'A5', type: 'identity_theft', table: 'customers', description: 'Same email linked to multiple companies' },
  // 6. DUPLICATE INVOICE NUMBER: Same number across currencies
  { id: 'A6', type: 'duplicate_invoice_number', table: 'invoices', description: 'Duplicate invoice number in different currencies' },
  // 7. FUTURE-DATED TRANSACTION: Transaction dated in future
  { id: 'A7', type: 'future_dated', table: 'transactions', description: 'Transaction with future initiation date' },
  // 8. ORPHAN LINE ITEM: Line item without parent invoice
  { id: 'A8', type: 'orphan_line_item', table: 'invoiceItems', description: 'Line item references non-existent invoice' },
  // 9. DISPUTE AMOUNT EXCEEDS INVOICE: Dispute > invoice total
  { id: 'A9', type: 'dispute_exceeds_invoice', table: 'disputes', description: 'Dispute amount exceeds original invoice total' },
  // 10. NEGATIVE BALANCE: Available balance < withheld
  { id: 'A10', type: 'negative_balance', table: 'balances', description: 'Available balance less than withheld' },
  // 11. PLAN PRICING INCONSISTENCY: Monthly price doesn't match annual
  { id: 'A11', type: 'plan_pricing_inconsistency', table: 'plans', description: 'Annual plan monthly equivalent inconsistent' },
  // 12. SUBSCRIPTION WITHOUT PLAN: Subscription references deleted plan
  { id: 'A12', type: 'subscription_without_plan', table: 'plans', description: 'Subscription references non-existent plan' },
  // 13. PAYMENT WITHOUT INVOICE: Payment references non-existent invoice
  { id: 'A13', type: 'payment_without_invoice', table: 'invoicePayments', description: 'Payment references non-existent invoice' },
  // 14. REFUND EXCEEDS PAYMENT: Refund amount > original payment
  { id: 'A14', type: 'refund_exceeds_payment', table: 'invoicePayments', description: 'Refund amount exceeds original payment' },
  // 15. TRANSACTION FEE ANOMALY: Fee > 10% of amount
  { id: 'A15', type: 'excessive_fee', table: 'transactions', description: 'Transaction fee exceeds 10% of amount' },
  // 16. ZERO-AMOUNT INVOICE: Invoice with $0 total but line items
  { id: 'A16', type: 'zero_amount_invoice', table: 'invoices', description: 'Invoice total is zero but has line items' },
  // 17. CUSTOMER WITH NO INVOICES: Customer exists but no invoices
  { id: 'A17', type: 'customer_no_invoices', table: 'customers', description: 'Customer record with zero invoices' },
  // 18. PAYOUT TO UNKNOWN RECIPIENT: Payout without campaign/recipient
  { id: 'A18', type: 'unknown_payout_recipient', table: 'payouts', description: 'Payout to unknown recipient without campaign' },
] as const;

// Generate base dataset
function generateDataset() {
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-12-31');
  const today = new Date();

  // 1. CUSTOMERS (25 unique)
  const companies = [
    'Acme Corporation', 'Globex Inc', 'Wayne Enterprises', 'Stark Industries', 'Umbrella Corp',
    'Cyberdyne Systems', 'Oscorp Industries', 'LexCorp', 'WayneTech', 'Stark Solutions',
    'Aperture Science', 'Black Mesa', 'Massive Dynamic', 'Weyland-Yutani', 'Tyrell Corp',
    'Soylent Corp', 'Initech', 'Hooli', 'Pied Piper', 'Hooli XYZ',
    'Soylent Green', 'Cybertron', 'Skynet', 'HAL Systems', 'Deep Thought'
  ];

  const customers = companies.map((company, i) => ({
    id: `CUST-${String(i + 1).padStart(3, '0')}`,
    name: `Contact ${i + 1}`,
    company,
    email: company.toLowerCase().replace(/\s+/g, '.') + '@example.com',
    totalInvoiced: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    invoiceCount: 0,
  }));

  // ANOMALY A5: Identity theft - same email, different company
  customers[5].email = customers[0].email; // Cyberdyne uses Acme's email
  customers[5].company = 'Cyberdyne Systems (ANOMALY)';

  // ANOMALY A17: Customer with no invoices
  customers[24].company = 'Ghost Corp (ANOMALY - No Invoices)';

  // 2. PRODUCTS (8 products)
  const products = [
    { id: 'PROD-001', name: 'AI Procurement Platform', type: 'Service', category: 'Software', createTime: '2025-01-15', updateTime: '2025-06-10' },
    { id: 'PROD-002', name: 'Milestone Invoicing Suite', type: 'Service', category: 'Software', createTime: '2025-02-01', updateTime: '2025-07-15' },
    { id: 'PROD-003', name: 'Analytics Command Center', type: 'Digital', category: 'Software', createTime: '2025-03-10', updateTime: '2025-08-20' },
    { id: 'PROD-004', name: 'Gantt Scheduler Pro', type: 'Digital', category: 'Software', createTime: '2025-04-01', updateTime: '2025-09-05' },
    { id: 'PROD-005', name: 'Dispute Triage Bot', type: 'Service', category: 'Software', createTime: '2025-05-15', updateTime: '2025-10-10' },
    { id: 'PROD-006', name: 'Reconciliation Engine', type: 'Digital', category: 'Software', createTime: '2025-06-01', updateTime: '2025-11-01' },
    { id: 'PROD-007', name: 'Channel3 Connector', type: 'Service', category: 'Integration', createTime: '2025-07-01', updateTime: '2025-11-15' },
    { id: 'PROD-008', name: 'PayPal SDK Wrapper', type: 'Digital', category: 'Library', createTime: '2025-08-01', updateTime: '2025-12-01' },
  ].map(p => ({ ...p, planCount: 0, avgMonthlyPrice: 0 }));

  // 3. PLANS (12 plans across products)
  const plans = [
    { id: 'PLAN-001', productId: 'PROD-001', name: 'Starter Monthly', status: 'Active', billingInterval: 'Every month', price: 49, monthlyPrice: 49, trialDays: 0, setupFee: 0 },
    { id: 'PLAN-002', productId: 'PROD-001', name: 'Professional Monthly', status: 'Active', billingInterval: 'Every month', price: 199, monthlyPrice: 199, trialDays: 14, setupFee: 0 },
    { id: 'PLAN-003', productId: 'PROD-001', name: 'Enterprise Annual', status: 'Active', billingInterval: 'Every year', price: 1999, monthlyPrice: 166.58, trialDays: 30, setupFee: 499 },
    { id: 'PLAN-004', productId: 'PROD-002', name: 'Starter Monthly', status: 'Active', billingInterval: 'Every month', price: 79, monthlyPrice: 79, trialDays: 0, setupFee: 0 },
    { id: 'PLAN-005', productId: 'PROD-002', name: 'Professional Monthly', status: 'Active', billingInterval: 'Every month', price: 299, monthlyPrice: 299, trialDays: 14, setupFee: 0 },
    { id: 'PLAN-006', productId: 'PROD-002', name: 'Enterprise Annual', status: 'Active', billingInterval: 'Every year', price: 2999, monthlyPrice: 249.92, trialDays: 30, setupFee: 999 },
    { id: 'PLAN-007', productId: 'PROD-003', name: 'Standard Monthly', status: 'Active', billingInterval: 'Every month', price: 149, monthlyPrice: 149, trialDays: 7, setupFee: 0 },
    { id: 'PLAN-008', productId: 'PROD-003', name: 'Enterprise Annual', status: 'Active', billingInterval: 'Every year', price: 1499, monthlyPrice: 124.92, trialDays: 30, setupFee: 0 },
    { id: 'PLAN-009', productId: 'PROD-004', name: 'Pro Monthly', status: 'Active', billingInterval: 'Every month', price: 99, monthlyPrice: 99, trialDays: 14, setupFee: 0 },
    { id: 'PLAN-010', productId: 'PROD-004', name: 'Team Annual', status: 'Active', billingInterval: 'Every year', price: 999, monthlyPrice: 83.25, trialDays: 30, setupFee: 0 },
    { id: 'PLAN-011', productId: 'PROD-005', name: 'Auto Monthly', status: 'Active', billingInterval: 'Every month', price: 129, monthlyPrice: 129, trialDays: 0, setupFee: 0 },
    { id: 'PLAN-012', productId: 'PROD-006', name: 'Recon Monthly', status: 'Active', billingInterval: 'Every month', price: 89, monthlyPrice: 89, trialDays: 7, setupFee: 0 },
  ];

  // ANOMALY A11: Plan pricing inconsistency - Enterprise Annual monthly equivalent wrong
  plans[2].monthlyPrice = 99.99; // Should be ~166.58 (1999/12)

  // 4. INVOICES (100 invoices)
  const invoiceStatuses = ['Draft', 'Sent', 'Scheduled', 'Unpaid', 'Payment Pending', 'Paid', 'Partially Paid', 'Refunded', 'Cancelled'];
  const paymentTerms = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt'];
  const currencies = CURRENCIES;

  const invoices = [];
  const invoiceNumbers = new Set<string>();

  for (let i = 0; i < 100; i++) {
    const customer = randomChoice(customers);
    const currency = randomChoice(currencies);
    const status = randomChoice(invoiceStatuses);
    const term = randomChoice(paymentTerms);
    const daysAgo = randomInt(0, 365);
    const invoiceDate = randomDate(new Date(today.getTime() - daysAgo * 86400000), today);
    const dueDate = new Date(invoiceDate);
    const termDays = parseInt(term.match(/\d+/) || ['30']) || 30;
    dueDate.setDate(dueDate.getDate() + termDays);

    let invoiceNumber: string;
    do {
      invoiceNumber = `INV-${invoiceDate.getFullYear()}${String(invoiceDate.getMonth() + 1).padStart(2, '0')}-${String(randomInt(1000, 9999))}`;
    } while (invoiceNumbers.has(invoiceNumber));
    invoiceNumbers.add(invoiceNumber);

    const itemCount = randomInt(1, 5);
    let total = 0;
    for (let j = 0; j < itemCount; j++) {
      total += round2(randomInt(50, 500) * randomInt(1, 10));
    }

    // ANOMALY A16: Zero-amount invoice with line items
    const isZeroAmount = i === 0;
    if (isZeroAmount) total = 0;

    // ANOMALY A6: Duplicate invoice number in different currency (INV-202501-1000 in USD and EUR)
    if (i === 1) {
      const baseNum = 'INV-202501-1000';
      invoiceNumber = baseNum;
    }

    const daysOverdue = status !== 'Draft' && status !== 'Scheduled' && status !== 'Cancelled' && dueDate < today
      ? Math.ceil((today.getTime() - dueDate.getTime()) / 86400000)
      : 0;

    invoices.push({
      id: `INV-${String(i + 1).padStart(4, '0')}`,
      number: invoiceNumber,
      customerId: customer.id,
      status,
      statusGroup: ['Draft', 'Scheduled', 'Cancelled'].includes(status) ? 'Draft' : 'Open',
      currency,
      paymentTerm: term,
      invoiceDate: invoiceDate.toISOString().slice(0, 10),
      dueDate: dueDate.toISOString().slice(0, 10),
      total: isZeroAmount ? 0 : round2(total * FX_RATES[currency]),
      issuedAmount: ['Draft', 'Scheduled', 'Cancelled'].includes(status) ? 0 : round2(total * FX_RATES[currency]),
      paidAmount: status === 'Paid' ? round2(total * FX_RATES[currency]) : (status === 'Partially Paid' ? round2(total * FX_RATES[currency] * 0.6) : 0),
      refundedAmount: status === 'Refunded' ? round2(total * FX_RATES[currency] * 0.5) : 0,
      netCollected: 0, // calculated
      isReceivable: !['Draft', 'Scheduled', 'Cancelled'].includes(status),
      outstanding: ['Sent', 'Unpaid', 'Payment Pending', 'Partially Paid'].includes(status) ? round2(total * FX_RATES[currency] * (status === 'Partially Paid' ? 0.4 : 1)) : 0,
      overdueAmount: daysOverdue > 0 && ['Sent', 'Unpaid', 'Payment Pending', 'Partially Paid'].includes(status) ? round2(total * FX_RATES[currency] * (status === 'Partially Paid' ? 0.4 : 1)) : 0,
      daysOverdue,
      agingBucket: daysOverdue <= 0 ? '0. Not yet due' : daysOverdue <= 30 ? '1. 1-30 days' : daysOverdue <= 60 ? '2. 31-60 days' : daysOverdue <= 90 ? '3. 61-90 days' : '4. 90+ days',
      daysToPay: status === 'Paid' ? randomInt(5, 45) : null,
      taxTotal: round2(total * 0.08 * FX_RATES[currency]),
    });
  }

  // Calculate netCollected
  invoices.forEach(inv => {
    inv.netCollected = round2(inv.paidAmount - inv.refundedAmount);
  });

  // 5. INVOICE ITEMS (200-500 line items)
  const invoiceItems = [];
  invoices.forEach(inv => {
    const itemCount = randomInt(1, 5);
    const product = randomChoice(products);
    for (let j = 0; j < itemCount; j++) {
      const quantity = randomInt(1, 10);
      const unitPrice = round2(randomInt(50, 500) * FX_RATES[inv.currency as Currency]);
      const gross = round2(quantity * unitPrice);
      const discount = round2(gross * randomInt(0, 15) / 100);
      const tax = round2((gross - discount) * 0.08);
      invoiceItems.push({
        id: `${inv.id}-ITEM-${j + 1}`,
        invoiceId: inv.id,
        name: product.name,
        unit: 'EA',
        quantity,
        unitPrice,
        gross,
        discount,
        tax,
        lineTotal: round2(gross - discount + tax),
      });
    }
  });

  // ANOMALY A8: Orphan line item
  invoiceItems.push({
    id: 'ORPHAN-ITEM-001',
    invoiceId: 'INV-NONEXISTENT-9999',
    name: 'Ghost Product (ANOMALY)',
    unit: 'EA',
    quantity: 1,
    unitPrice: 999,
    gross: 999,
    discount: 0,
    tax: 80,
    lineTotal: 1079,
  });

  // ANOMALY A3: Negative inventory - quantity exceeds reasonable limits
  invoiceItems[5].quantity = 10000;
  invoiceItems[5].name = 'Oversold Item (ANOMALY)';

  // 6. INVOICE PAYMENTS & REFUNDS
  const invoicePayments = [];
  invoices.forEach(inv => {
    if (inv.paidAmount > 0) {
      const paymentCount = inv.status === 'Paid' ? 1 : randomInt(1, 2);
      for (let p = 0; p < paymentCount; p++) {
        const amount = p === 0 ? inv.paidAmount : round2(inv.paidAmount * 0.4);
        const daysAfterInvoice = randomInt(1, 60);
        const paymentDate = new Date(inv.invoiceDate);
        paymentDate.setDate(paymentDate.getDate() + daysAfterInvoice);

        // ANOMALY A2: Currency mismatch (USD invoice, EUR payment)
        const paymentCurrency = inv.id === 'INV-0003' ? 'EUR' : inv.currency;

        invoicePayments.push({
          id: `PAY-${inv.id}-${p + 1}`,
          invoiceId: inv.id,
          kind: 'Payment',
          method: randomChoice(['PayPal', 'Bank Transfer', 'Credit Card', 'Wire Transfer']),
          date: paymentDate.toISOString().slice(0, 10),
          amount: round2(amount * (paymentCurrency === inv.currency ? 1 : FX_RATES[paymentCurrency as Currency] / FX_RATES[inv.currency as Currency])),
          signedAmount: round2(amount * (paymentCurrency === inv.currency ? 1 : FX_RATES[paymentCurrency as Currency] / FX_RATES[inv.currency as Currency])),
        });
      }
    }

    if (inv.refundedAmount > 0) {
      const refundAmount = inv.refundedAmount;
      const daysAfterPayment = randomInt(1, 30);
      const refundDate = new Date(inv.invoiceDate);
      refundDate.setDate(refundDate.getDate() + daysAfterPayment + 30);

      // ANOMALY A14: Refund exceeds original payment
      const actualRefundAmount = inv.id === 'INV-0005' ? round2(inv.paidAmount * 1.5) : refundAmount;

      invoicePayments.push({
        id: `REF-${inv.id}-1`,
        invoiceId: inv.id,
        kind: 'Refund',
        method: randomChoice(['PayPal', 'Bank Transfer', 'Credit Card']),
        date: refundDate.toISOString().slice(0, 10),
        amount: actualRefundAmount,
        signedAmount: -actualRefundAmount,
      });
    }
  });

  // ANOMALY A13: Payment without invoice
  invoicePayments.push({
    id: 'PAY-GHOST-001',
    invoiceId: 'INV-NONEXISTENT-9999',
    kind: 'Payment',
    method: 'PayPal',
    date: '2025-06-15',
    amount: 5000,
    signedAmount: 5000,
  });

  // 7. TRANSACTIONS (250 PayPal transactions)
  const transactions = [];
  const eventCodes = ['T0001', 'T0002', 'T0003', 'T0004', 'T0005', 'T1105', 'T1503', 'T1504', 'T1505'];
  const eventTypes = {
    'T0001': 'Payout',
    'T0002': 'Payment Received',
    'T0003': 'Refund',
    'T0004': 'Fee',
    'T0005': 'Transfer',
    'T1105': 'Hold Released',
    'T1503': 'Payout Hold',
    'T1504': 'Reserve Hold',
    'T1505': 'Rolling Reserve',
  };
  const statuses = ['Success', 'Pending', 'Denied', 'Reversed', 'Partially Refunded'];

  let runningBalance = 50000; // Starting balance in USD cents equivalent

  for (let i = 0; i < 250; i++) {
    const currency = randomChoice(currencies);
    const eventCode = randomChoice(eventCodes);
    const isDebit = ['T0001', 'T1503', 'T1504', 'T1505'].includes(eventCode) || Math.random() > 0.6;
    const baseAmount = round2(randomInt(10, 5000) * FX_RATES[currency]);
    const amount = isDebit ? -baseAmount : baseAmount;
    const fee = round2(baseAmount * (randomInt(20, 350) / 10000)); // 0.2% - 3.5%
    const date = randomDate(startDate, endDate);

    // ANOMALY A7: Future-dated transaction
    const transactionDate = i === 0 ? new Date(today.getTime() + 30 * 86400000) : date;

    // ANOMALY A4: Policy cap exceeded - autonomous > $500
    const isAutonomous = i < 50; // First 50 are autonomous
    const policyCapAmount = isAutonomous && i === 1 ? 75000 * FX_RATES[currency] : baseAmount; // $750 > $500 cap

    // ANOMALY A15: Excessive fee > 10%
    const actualFee = i === 2 ? round2(baseAmount * 0.15) : fee; // 15% fee

    const finalAmount = isDebit ? -policyCapAmount : policyCapAmount;
    const net = round2(finalAmount + (isDebit ? -actualFee : actualFee));
    runningBalance += net;

    // ANOMALY A1: Double-entry violation - unbalanced
    const isUnbalanced = i === 3;

    transactions.push({
      id: `TXN-${String(i + 1).padStart(6, '0')}`,
      date: transactionDate.toISOString().slice(0, 10),
      eventType: eventTypes[eventCode as keyof typeof eventTypes] || 'Unknown',
      status: randomChoice(statuses),
      direction: isDebit ? 'Debit' : 'Credit',
      currency,
      amount: isUnbalanced ? round2(finalAmount * 1.001) : finalAmount, // Slight imbalance
      fee: actualFee,
      net: isUnbalanced ? round2(net * 1.001) : net,
      endingBalance: round2(runningBalance),
      counterparty: randomChoice(customers.map(c => c.email).concat([null, null, null])),
      note: isAutonomous ? 'Autonomous transaction' : 'Manual transaction',
      eventCode,
      referenceId: `REF-${String(i + 1).padStart(6, '0')}`,
    });
  }

  // 8. PAYOUTS (from T0001 transactions)
  const payouts = transactions
    .filter(t => t.eventCode === 'T0001')
    .map((t, i) => ({
      id: t.id,
      campaign: randomChoice(['Marketing', 'Engineering', 'Sales', 'Operations', 'Partnerships', 'Other']),
      recipient: t.counterparty || 'Unknown',
      date: t.date,
      status: t.status,
      amount: Math.abs(t.amount),
      fee: t.fee,
      note: t.note,
    }));

  // ANOMALY A18: Unknown payout recipient
  payouts.push({
    id: 'PAYOUT-ANOMALY-001',
    campaign: 'Unknown',
    recipient: 'Unknown (ANOMALY)',
    date: '2025-07-15',
    status: 'Success',
    amount: 10000,
    fee: 50,
    note: 'Payout without campaign or known recipient',
  });

  // 9. BALANCES (multi-currency)
  const balances = currencies.map(currency => {
    const total = round2(randomInt(10000, 100000) * FX_RATES[currency]);
    const withheld = round2(total * randomInt(5, 20) / 100);

    // ANOMALY A10: Negative balance (available < withheld)
    const available = currency === 'JPY' && randomInt(0, 100) < 10
      ? round2(withheld * 0.5) // Available less than withheld
      : round2(total - withheld);

    return {
      currency,
      total,
      available,
      withheld,
    };
  });

  // 10. DISPUTES (15 disputes)
  const disputeReasons = ['Merchandise Not Received', 'Not As Described', 'Unauthorized', 'Duplicate', 'Other'];
  const disputeStatuses = ['Open', 'Waiting for Buyer Response', 'Waiting for Seller Response', 'Under Review', 'Resolved'];
  const disputeOutcomes = ['Buyer Favored', 'Seller Favored', 'Mutual Agreement', null];

  const disputes = [];
  for (let i = 0; i < 15; i++) {
    const invoice = randomChoice(invoices.filter(inv => inv.status === 'Paid' || inv.status === 'Partially Paid'));
    const baseAmount = invoice.total;
    const disputeAmount = i === 0 ? round2(baseAmount * 1.5) : round2(baseAmount * randomInt(10, 100) / 100); // ANOMALY A9: Dispute exceeds invoice
    const createDate = new Date(invoice.invoiceDate);
    createDate.setDate(createDate.getDate() + randomInt(5, 60));

    disputes.push({
      id: `DISP-${String(i + 1).padStart(4, '0')}`,
      createTime: createDate.toISOString(),
      updateTime: new Date(createDate.getTime() + randomInt(1, 30) * 86400000).toISOString(),
      status: randomChoice(disputeStatuses),
      amount: disputeAmount,
      reason: randomChoice(disputeReasons),
      channel: randomChoice(['Internal', 'External']),
      outcome: randomChoice(disputeOutcomes),
      signedAmount: -disputeAmount,
    });
  }

  // 11. CUSTOMER AGGREGATES
  customers.forEach(cust => {
    const custInvoices = invoices.filter(inv => inv.customerId === cust.id);
    cust.invoiceCount = custInvoices.length;
    cust.totalInvoiced = round2(custInvoices.reduce((sum, inv) => sum + inv.issuedAmount, 0));
    cust.totalPaid = round2(custInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0));
    cust.totalOutstanding = round2(custInvoices.reduce((sum, inv) => sum + inv.outstanding, 0));
  });

  // 12. PRODUCT AGGREGATES
  products.forEach(prod => {
    const prodPlans = plans.filter(p => p.productId === prod.id);
    prod.planCount = prodPlans.length;
    prod.avgMonthlyPrice = prodPlans.length > 0
      ? round2(prodPlans.reduce((sum, p) => sum + (p.monthlyPrice || 0), 0) / prodPlans.length)
      : 0;
  });

  return {
    customers,
    invoices,
    invoiceItems,
    invoicePayments,
    products,
    plans,
    transactions,
    payouts,
    balances,
    disputes,
    anomalies: ANOMALY_TYPES,
  };
}

// Generate and write dataset
const dataset = generateDataset();

const outputDir = join(__dirname, '..', 'data', 'generated');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Write individual table files
const tables = [
  'customers', 'invoices', 'invoiceItems', 'invoicePayments',
  'products', 'plans', 'transactions', 'payouts', 'balances', 'disputes'
];

tables.forEach(table => {
  const filename = join(outputDir, `${table}.json`);
  writeFileSync(filename, JSON.stringify(dataset[table as keyof typeof dataset], null, 2));
  console.log(`✅ Written ${filename} (${(dataset[table as keyof typeof dataset] as any[]).length} records)`);
});

// Write combined dataset
writeFileSync(join(outputDir, 'full-dataset.json'), JSON.stringify(dataset, null, 2));
console.log('✅ Written full-dataset.json');

// Write anomaly manifest
const anomalyManifest = {
  generatedAt: new Date().toISOString(),
  totalTransactions: dataset.transactions.length,
  totalRecords: Object.values(dataset).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
  anomalies: ANOMALY_TYPES.map(a => ({
    ...a,
    severity: ['A1', 'A4', 'A9', 'A10', 'A14', 'A15'].includes(a.id) ? 'CRITICAL' :
              ['A2', 'A3', 'A5', 'A6', 'A7', 'A8', 'A11', 'A12', 'A13', 'A16', 'A17', 'A18'].includes(a.id) ? 'HIGH' : 'MEDIUM',
    detectableBy: ['invariants', 'reconciliation', 'schema-validation', 'manual-review'],
  })),
  tables: tables.map(t => ({ name: t, count: (dataset[t as keyof typeof dataset] as any[]).length })),
};
writeFileSync(join(outputDir, 'anomaly-manifest.json'), JSON.stringify(anomalyManifest, null, 2));
console.log('✅ Written anomaly-manifest.json');

console.log('\n📊 Dataset Summary:');
console.log(`   Customers: ${dataset.customers.length}`);
console.log(`   Invoices: ${dataset.invoices.length}`);
console.log(`   Invoice Items: ${dataset.invoiceItems.length}`);
console.log(`   Invoice Payments: ${dataset.invoicePayments.length}`);
console.log(`   Products: ${dataset.products.length}`);
console.log(`   Plans: ${dataset.plans.length}`);
console.log(`   Transactions: ${dataset.transactions.length}`);
console.log(`   Payouts: ${dataset.payouts.length}`);
console.log(`   Balances: ${dataset.balances.length}`);
console.log(`   Disputes: ${dataset.disputes.length}`);
console.log(`   Anomalies: ${ANOMALY_TYPES.length}`);