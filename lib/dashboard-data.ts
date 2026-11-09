// Dashboard Data Transformation - Relational data model for AG Studio
// Transforms PayPal API responses into related tables for AG Studio

import {
  amountOf,
  getBalances,
  listDisputes,
  listInvoices,
  listPlans,
  listProducts,
  searchTransactions,
  TRANSACTION_SEARCH_MAX_DAYS,
  type Balances,
  type Dispute,
  type Invoice,
  type InvoiceStatus,
  type Plan,
  type Product,
  type ShippingTracker,
  type Transaction,
} from './paypal-client';
import { getDemoDashboardData, isDemoMode } from './demo-data';

const DAY_MS = 86_400_000;

const round2 = (n: number) => Math.round(n * 100) / 100;
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

// Human-readable status mapping
const humanise = (code: string) =>
  code[0] + code.slice(1).toLowerCase().replaceAll('_', ' ');

const STATUS_GROUP: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  SENT: 'Open',
  UNPAID: 'Open',
  PAYMENT_PENDING: 'Open',
  PARTIALLY_PAID: 'Partially paid',
  PAID: 'Paid',
  MARKED_AS_PAID: 'Paid',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Refunded',
  MARKED_AS_REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
};

const UNISSUED = new Set<InvoiceStatus>(['DRAFT', 'SCHEDULED', 'CANCELLED']);
const RECEIVABLE = new Set<InvoiceStatus>([
  'SENT',
  'UNPAID',
  'PAYMENT_PENDING',
  'PARTIALLY_PAID',
]);

// Customer ID derived from invoice recipient email
const customerIdOf = (invoice: Invoice) =>
  invoice.primary_recipients?.[0]?.billing_info?.email_address?.toLowerCase() ?? 'unknown';

function agingBucket(daysOverdue: number): string {
  if (daysOverdue <= 0) return '0. Not yet due';
  if (daysOverdue <= 30) return '1. 1-30 days';
  if (daysOverdue <= 60) return '2. 31-60 days';
  if (daysOverdue <= 90) return '3. 61-90 days';
  return '4. 90+ days';
}

function invoiceRows(invoices: Invoice[], today: string) {
  return invoices.map((inv) => {
    const total = amountOf(inv.amount);
    const paid = amountOf(inv.payments?.paid_amount);
    const refunded = amountOf(inv.refunds?.refund_amount);
    const receivable = RECEIVABLE.has(inv.status);
    const outstanding = receivable ? amountOf(inv.due_amount) : 0;
    const dueDate = inv.detail.payment_term?.due_date ?? inv.detail.invoice_date ?? null;
    const daysOverdue = receivable && dueDate ? Math.max(0, daysBetween(dueDate, today)) : 0;
    const firstPayment = inv.payments?.transactions
      ?.map((t) => t.payment_date)
      .filter((d) => d !== undefined)
      .sort()[0];

    return {
      id: inv.id,
      number: inv.detail.invoice_number,
      customerId: customerIdOf(inv),
      status: humanise(inv.status),
      statusGroup: STATUS_GROUP[inv.status],
      currency: inv.detail.currency_code,
      paymentTerm: inv.detail.payment_term?.term_type ? humanise(inv.detail.payment_term.term_type) : null,
      invoiceDate: inv.detail.invoice_date ?? null,
      dueDate,
      total,
      issuedAmount: UNISSUED.has(inv.status) ? 0 : total,
      paidAmount: paid,
      refundedAmount: refunded,
      netCollected: round2(paid - refunded),
      isReceivable: receivable,
      outstanding,
      overdueAmount: daysOverdue > 0 ? outstanding : 0,
      daysOverdue,
      agingBucket: receivable ? agingBucket(daysOverdue) : null,
      daysToPay: firstPayment && inv.detail.invoice_date ? daysBetween(inv.detail.invoice_date, firstPayment) : null,
      taxTotal: amountOf(inv.amount?.breakdown?.tax_total),
    };
  });
}

function customerRows(invoices: Invoice[]) {
  const byId = new Map<string, { id: string; name: string; company: string | null; email: string | null }>();
  for (const inv of invoices) {
    const info = inv.primary_recipients?.[0]?.billing_info;
    const id = customerIdOf(inv);
    if (!byId.has(id)) {
      byId.set(id, {
        id,
        name: info?.name?.full_name ?? info?.email_address ?? 'Unknown',
        company: info?.business_name ?? 'Individual',
        email: info?.email_address ?? null,
      });
    }
  }
  return [...byId.values()];
}

function invoiceItemRows(invoices: Invoice[]) {
  return invoices.flatMap((inv) =>
    (inv.items ?? []).map((item, i) => {
      const gross = Number(item.quantity) * amountOf(item.unit_amount);
      const discount = item.discount?.amount
        ? amountOf(item.discount.amount)
        : (gross * Number(item.discount?.percent ?? 0)) / 100;
      const tax = item.tax?.amount
        ? amountOf(item.tax.amount)
        : ((gross - discount) * Number(item.tax?.percent ?? 0)) / 100;
      return {
        id: item.id ?? `${inv.id}-${i + 1}`,
        invoiceId: inv.id,
        name: item.name,
        unit: item.unit_of_measure ? humanise(item.unit_of_measure) : null,
        quantity: Number(item.quantity),
        unitPrice: amountOf(item.unit_amount),
        gross: round2(gross),
        discount: round2(discount),
        tax: round2(tax),
        lineTotal: round2(gross - discount + tax),
      };
    }),
  );
}

function invoicePaymentRows(invoices: Invoice[]) {
  return invoices.flatMap((inv) => [
    ...(inv.payments?.transactions ?? []).map((t, i) => ({
      id: t.payment_id ?? `${inv.id}-payment-${i + 1}`,
      invoiceId: inv.id,
      kind: 'Payment',
      method: t.method ? humanise(t.method) : 'Unknown',
      date: t.payment_date ?? null,
      amount: amountOf(t.amount),
      signedAmount: amountOf(t.amount),
    })),
    ...(inv.refunds?.transactions ?? []).map((t, i) => ({
      id: t.recipient_transaction_id ?? `${inv.id}-refund-${i + 1}`,
      invoiceId: inv.id,
      kind: 'Refund',
      method: t.method ? humanise(t.method) : 'Unknown',
      date: t.refund_date ?? null,
      amount: amountOf(t.amount),
      signedAmount: -amountOf(t.amount),
    })),
  ]);
}

// Dispute transformation
function disputeRows(disputes: Dispute[]) {
  return disputes.map((d) => ({
    id: d.dispute_id,
    createTime: d.create_time,
    updateTime: d.update_time,
    status: humanise(d.status),
    amount: amountOf(d.dispute_amount),
    reason: d.reason,
    channel: d.dispute_channel,
    outcome: d.dispute_outcome?.outcome_code ? humanise(d.dispute_outcome.outcome_code) : null,
    signedAmount: -amountOf(d.dispute_amount), // Negative for dispute exposure
  }));
}

// Catalog transformation
const MONTHS_PER_INTERVAL: Record<string, number> = {
  DAY: 12 / 365,
  WEEK: 12 / 52,
  MONTH: 1,
  YEAR: 12,
};
const DAYS_PER_INTERVAL: Record<string, number> = {
  DAY: 1,
  WEEK: 7,
  MONTH: 365 / 12,
  YEAR: 365,
};

function productRows(products: Product[]) {
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type ? humanise(p.type) : null,
    category: p.category ? humanise(p.category) : null,
    description: p.description ?? null,
    createTime: p.create_time,
    updateTime: p.update_time,
  }));
}

function planRows(plans: Plan[]) {
  return plans.map((plan) => {
    const regular = plan.billing_cycles.find((c) => c.tenure_type === 'REGULAR');
    const trial = plan.billing_cycles.find((c) => c.tenure_type === 'TRIAL');
    const price = regular?.pricing_scheme?.fixed_price ? amountOf(regular.pricing_scheme.fixed_price) : null;
    const unit = regular?.frequency.interval_unit;
    const count = regular?.frequency.interval_count ?? 1;
    return {
      id: plan.id,
      productId: plan.product_id,
      name: plan.name,
      status: humanise(plan.status),
      billingInterval: unit ? (count === 1 ? `Every ${unit.toLowerCase()}` : `Every ${count} ${unit.toLowerCase()}s`) : null,
      price,
      monthlyPrice: price !== null && unit ? round2(price / (count * MONTHS_PER_INTERVAL[unit])) : null,
      trialDays: trial
        ? Math.round(trial.frequency.interval_count * DAYS_PER_INTERVAL[trial.frequency.interval_unit])
        : 0,
      setupFee: amountOf(plan.payment_preferences?.setup_fee),
    };
  });
}

// Ledger transformation
const EVENT_TYPES: Record<string, string> = {
  T0001: 'Payout',
  T1105: 'Hold released',
  T1503: 'Payout hold',
};

const STATUSES: Record<string, string> = {
  S: 'Success',
  P: 'Pending',
  D: 'Denied',
  V: 'Reversed',
  F: 'Partially refunded',
};

const statusOf = (code?: string) => (code ? (STATUSES[code] ?? code) : null);

const campaignOf = (customField?: string) => {
  const campaign = customField?.match(/^([A-Z]+)-/)?.[1];
  return campaign ? humanise(campaign) : 'Other';
};

function transactionRows(transactions: Transaction[]) {
  return transactions.map(({ transaction_info: t, payer_info: p }) => {
    const amt = amountOf(t.transaction_amount);
    const fee = amountOf(t.fee_amount);
    return {
      id: t.transaction_id,
      date: t.transaction_initiation_date ?? null,
      eventType: EVENT_TYPES[t.transaction_event_code ?? ''] ?? t.transaction_event_code ?? 'Unknown',
      status: statusOf(t.transaction_status),
      direction: amt < 0 ? 'Debit' : 'Credit',
      currency: t.transaction_amount?.currency_code ?? null,
      amount: amt,
      fee,
      net: round2(amt + fee),
      endingBalance: t.ending_balance ? amountOf(t.ending_balance) : null,
      counterparty: p?.email_address ?? null,
      note: t.transaction_note ?? null,
      eventCode: t.transaction_event_code ?? null,
      referenceId: t.paypal_reference_id ?? null,
    };
  });
}

function payoutRows(transactions: Transaction[]) {
  return transactions
    .filter((t) => t.transaction_info.transaction_event_code === 'T0001')
    .map(({ transaction_info: t, payer_info: p }) => ({
      id: t.transaction_id,
      campaign: campaignOf(t.custom_field),
      recipient: p?.email_address ?? 'Unknown',
      date: t.transaction_initiation_date ?? null,
      status: statusOf(t.transaction_status),
      amount: -amountOf(t.transaction_amount),
      fee: -amountOf(t.fee_amount),
      note: t.transaction_note ?? null,
    }));
}

function balanceRows({ balances = [] }: Balances) {
  return balances.map((b) => ({
    currency: b.currency,
    total: amountOf(b.total_balance),
    available: amountOf(b.available_balance),
    withheld: amountOf(b.withheld_balance),
  }));
}

// Main export
const TRANSACTION_WINDOW_MS = TRANSACTION_SEARCH_MAX_DAYS * DAY_MS;

export interface DashboardData {
  asOf: string;
  customers: ReturnType<typeof customerRows>;
  invoices: ReturnType<typeof invoiceRows>;
  invoiceItems: ReturnType<typeof invoiceItemRows>;
  invoicePayments: ReturnType<typeof invoicePaymentRows>;
  products: ReturnType<typeof productRows>;
  plans: ReturnType<typeof planRows>;
  transactions: ReturnType<typeof transactionRows>;
  payouts: ReturnType<typeof payoutRows>;
  balances: ReturnType<typeof balanceRows>;
  disputes: ReturnType<typeof disputeRows>;
}

export async function getDashboardData(asOf = new Date()): Promise<DashboardData> {
  // Use demo data when DEMO_MODE is true (for judges, E2E tests, and local development)
  if (isDemoMode()) {
    return getDemoDashboardData(asOf);
  }

  const [products, plans, invoices, transactions, balances, disputes] = await Promise.all([
    listProducts(),
    listPlans(),
    listInvoices(),
    searchTransactions(new Date(asOf.getTime() - TRANSACTION_WINDOW_MS), asOf),
    getBalances(),
    listDisputes(),
  ]);
  const today = asOf.toISOString().slice(0, 10);

  return {
    asOf: asOf.toISOString(),
    customers: customerRows(invoices),
    invoices: invoiceRows(invoices, today),
    invoiceItems: invoiceItemRows(invoices),
    invoicePayments: invoicePaymentRows(invoices),
    products: productRows(products),
    plans: planRows(plans),
    transactions: transactionRows(transactions),
    payouts: payoutRows(transactions),
    balances: balanceRows(balances),
    disputes: disputeRows(disputes),
  };
}

// AG Studio data source definitions - Full AgDataSourcesDefinition compatible
export function buildStudioData(data: DashboardData) {
  return {
    sources: [
      {
        id: 'customers',
        name: 'Customers',
        data: data.customers,
        fields: [
          { id: 'id', name: 'Customer ID', type: 'string', format: 'textFormat', hide: true },
          { id: 'name', name: 'Contact Name', type: 'string', format: 'textFormat' },
          { id: 'company', name: 'Company', type: 'string', format: 'textFormat' },
          { id: 'email', name: 'Email', type: 'string', format: 'textFormat' },
          { id: 'totalInvoiced', name: 'Total Invoiced', type: 'number', format: 'currencyFormat' },
          { id: 'totalPaid', name: 'Total Paid', type: 'number', format: 'currencyFormat' },
          { id: 'totalOutstanding', name: 'Outstanding', type: 'number', format: 'currencyFormat' },
          { id: 'invoiceCount', name: 'Invoice Count', type: 'number', format: 'textFormat' },
        ] as const,
        description: 'Customer entities derived from invoice recipients. Each customer aggregates their invoices, payments, and outstanding balances.',
      },
      {
        id: 'invoices',
        name: 'Invoices',
        data: data.invoices,
        fields: [
          { id: 'id', name: 'Invoice ID', type: 'string', format: 'textFormat', hide: true },
          { id: 'number', name: 'Invoice Number', type: 'string', format: 'textFormat' },
          { id: 'customerId', name: 'Customer ID', type: 'string', format: 'textFormat', hide: true },
          { id: 'status', name: 'Status', type: 'string', format: 'textFormat' },
          { id: 'statusGroup', name: 'Status Group', type: 'string', format: 'textFormat' },
          { id: 'currency', name: 'Currency', type: 'string', format: 'textFormat' },
          { id: 'paymentTerm', name: 'Payment Term', type: 'string', format: 'textFormat' },
          { id: 'invoiceDate', name: 'Invoice Date', type: 'date', format: 'dateFormat' },
          { id: 'dueDate', name: 'Due Date', type: 'date', format: 'dateFormat' },
          { id: 'total', name: 'Total Amount', type: 'number', format: 'currencyFormat' },
          { id: 'issuedAmount', name: 'Issued Amount', type: 'number', format: 'currencyFormat' },
          { id: 'paidAmount', name: 'Paid Amount', type: 'number', format: 'currencyFormat' },
          { id: 'refundedAmount', name: 'Refunded Amount', type: 'number', format: 'currencyFormat' },
          { id: 'netCollected', name: 'Net Collected', type: 'number', format: 'currencyFormat' },
          { id: 'isReceivable', name: 'Is Receivable', type: 'boolean', format: 'textFormat' },
          { id: 'outstanding', name: 'Outstanding', type: 'number', format: 'currencyFormat' },
          { id: 'overdueAmount', name: 'Overdue Amount', type: 'number', format: 'currencyFormat' },
          { id: 'daysOverdue', name: 'Days Overdue', type: 'number', format: 'textFormat' },
          { id: 'agingBucket', name: 'Aging Bucket', type: 'string', format: 'textFormat' },
          { id: 'daysToPay', name: 'Days to Pay', type: 'number', format: 'textFormat' },
          { id: 'taxTotal', name: 'Tax Total', type: 'number', format: 'currencyFormat' },
        ],
        description: 'PayPal invoices with payment status, aging, and collection metrics. Links to customers and line items.',
      },
      {
        id: 'invoiceItems',
        name: 'Invoice Line Items',
        data: data.invoiceItems,
        fields: [
          { id: 'id', name: 'Line Item ID', type: 'string', format: 'textFormat', hide: true },
          { id: 'invoiceId', name: 'Invoice ID', type: 'string', format: 'textFormat', hide: true },
          { id: 'name', name: 'Item Name', type: 'string', format: 'textFormat' },
          { id: 'unit', name: 'Unit', type: 'string', format: 'textFormat' },
          { id: 'quantity', name: 'Quantity', type: 'number', format: 'textFormat' },
          { id: 'unitPrice', name: 'Unit Price', type: 'number', format: 'currencyFormat' },
          { id: 'gross', name: 'Gross', type: 'number', format: 'currencyFormat' },
          { id: 'discount', name: 'Discount', type: 'number', format: 'currencyFormat' },
          { id: 'tax', name: 'Tax', type: 'number', format: 'currencyFormat' },
          { id: 'lineTotal', name: 'Line Total', type: 'number', format: 'currencyFormat' },
        ],
        description: 'Individual line items on invoices with pricing breakdown including discounts and taxes.',
      },
      {
        id: 'invoicePayments',
        name: 'Invoice Payments & Refunds',
        data: data.invoicePayments,
        fields: [
          { id: 'id', name: 'Payment ID', type: 'string', format: 'textFormat', hide: true },
          { id: 'invoiceId', name: 'Invoice ID', type: 'string', format: 'textFormat', hide: true },
          { id: 'kind', name: 'Type', type: 'string', format: 'textFormat' },
          { id: 'method', name: 'Method', type: 'string', format: 'textFormat' },
          { id: 'date', name: 'Date', type: 'date', format: 'dateFormat' },
          { id: 'amount', name: 'Amount', type: 'number', format: 'currencyFormat' },
          { id: 'signedAmount', name: 'Signed Amount', type: 'number', format: 'currencyFormat', description: 'Positive for payments, negative for refunds' },
        ],
        description: 'All payment and refund transactions linked to invoices. Signed amount enables net calculations.',
      },
      {
        id: 'products',
        name: 'Products',
        data: data.products,
        fields: [
          { id: 'id', name: 'Product ID', type: 'string', format: 'textFormat', hide: true },
          { id: 'name', name: 'Product Name', type: 'string', format: 'textFormat' },
          { id: 'type', name: 'Type', type: 'string', format: 'textFormat' },
          { id: 'category', name: 'Category', type: 'string', format: 'textFormat' },
          { id: 'description', name: 'Description', type: 'string', format: 'textFormat' },
          { id: 'createTime', name: 'Created', type: 'date', format: 'dateFormat' },
          { id: 'updateTime', name: 'Updated', type: 'date', format: 'dateFormat' },
          { id: 'planCount', name: 'Plan Count', type: 'number', format: 'textFormat' },
          { id: 'avgMonthlyPrice', name: 'Avg Monthly Price', type: 'number', format: 'currencyFormat' },
        ],
        description: 'PayPal catalog products with associated billing plans and pricing metrics.',
      },
      {
        id: 'plans',
        name: 'Billing Plans',
        data: data.plans,
        fields: [
          { id: 'id', name: 'Plan ID', type: 'string', format: 'textFormat', hide: true },
          { id: 'productId', name: 'Product ID', type: 'string', format: 'textFormat', hide: true },
          { id: 'name', name: 'Plan Name', type: 'string', format: 'textFormat' },
          { id: 'status', name: 'Status', type: 'string', format: 'textFormat' },
          { id: 'billingInterval', name: 'Billing Interval', type: 'string', format: 'textFormat' },
          { id: 'price', name: 'Price', type: 'number', format: 'currencyFormat' },
          { id: 'monthlyPrice', name: 'Monthly Equivalent', type: 'number', format: 'currencyFormat' },
          { id: 'trialDays', name: 'Trial Days', type: 'number', format: 'textFormat' },
          { id: 'setupFee', name: 'Setup Fee', type: 'number', format: 'currencyFormat' },
        ],
        description: 'Recurring billing plans linked to products with pricing, intervals, and trial periods.',
      },
      {
        id: 'transactions',
        name: 'PayPal Transactions',
        data: data.transactions,
        fields: [
          { id: 'id', name: 'Transaction ID', type: 'string', format: 'textFormat', hide: true },
          { id: 'date', name: 'Date', type: 'date', format: 'dateFormat' },
          { id: 'eventType', name: 'Event Type', type: 'string', format: 'textFormat' },
          { id: 'status', name: 'Status', type: 'string', format: 'textFormat' },
          { id: 'direction', name: 'Direction', type: 'string', format: 'textFormat' },
          { id: 'currency', name: 'Currency', type: 'string', format: 'textFormat' },
          { id: 'amount', name: 'Amount', type: 'number', format: 'currencyFormat' },
          { id: 'fee', name: 'Fee', type: 'number', format: 'currencyFormat' },
          { id: 'net', name: 'Net', type: 'number', format: 'currencyFormat' },
          { id: 'endingBalance', name: 'Ending Balance', type: 'number', format: 'currencyFormat' },
          { id: 'counterparty', name: 'Counterparty', type: 'string', format: 'textFormat' },
          { id: 'note', name: 'Note', type: 'string', format: 'textFormat' },
          { id: 'eventCode', name: 'Event Code', type: 'string', format: 'textFormat' },
          { id: 'referenceId', name: 'Reference ID', type: 'string', format: 'textFormat' },
        ],
        description: 'Raw PayPal transaction ledger with event types, fees, and running balances.',
      },
      {
        id: 'payouts',
        name: 'Payouts',
        data: data.payouts,
        fields: [
          { id: 'id', name: 'Payout ID', type: 'string', format: 'textFormat', hide: true },
          { id: 'campaign', name: 'Campaign', type: 'string', format: 'textFormat' },
          { id: 'recipient', name: 'Recipient', type: 'string', format: 'textFormat' },
          { id: 'date', name: 'Date', type: 'date', format: 'dateFormat' },
          { id: 'status', name: 'Status', type: 'string', format: 'textFormat' },
          { id: 'amount', name: 'Amount', type: 'number', format: 'currencyFormat' },
          { id: 'fee', name: 'Fee', type: 'number', format: 'currencyFormat' },
          { id: 'note', name: 'Note', type: 'string', format: 'textFormat' },
        ],
        description: 'Outbound payouts to vendors, partners, and teams grouped by campaign.',
      },
      {
        id: 'balances',
        name: 'Account Balances',
        data: data.balances,
        fields: [
          { id: 'currency', name: 'Currency', type: 'string', format: 'textFormat' },
          { id: 'total', name: 'Total Balance', type: 'number', format: 'currencyFormat' },
          { id: 'available', name: 'Available', type: 'number', format: 'currencyFormat' },
          { id: 'withheld', name: 'Withheld', type: 'number', format: 'currencyFormat' },
        ],
        description: 'Real-time PayPal account balances by currency showing available vs withheld funds.',
      },
      {
        id: 'disputes',
        name: 'Disputes',
        data: data.disputes,
        fields: [
          { id: 'id', name: 'Dispute ID', type: 'string', format: 'textFormat', hide: true },
          { id: 'createTime', name: 'Created', type: 'date', format: 'dateFormat' },
          { id: 'updateTime', name: 'Updated', type: 'date', format: 'dateFormat' },
          { id: 'status', name: 'Status', type: 'string', format: 'textFormat' },
          { id: 'amount', name: 'Dispute Amount', type: 'number', format: 'currencyFormat' },
          { id: 'reason', name: 'Reason', type: 'string', format: 'textFormat' },
          { id: 'channel', name: 'Channel', type: 'string', format: 'textFormat' },
          { id: 'outcome', name: 'Outcome', type: 'string', format: 'textFormat' },
          { id: 'signedAmount', name: 'Exposure', type: 'number', format: 'currencyFormat', description: 'Negative value representing financial exposure' },
        ],
        description: 'Customer disputes with amounts, reasons, and resolution outcomes. Exposure is negative for cashflow impact.',
      },
    ],
    relationships: [
      { id: 'invoice-customer', type: 'many-to-one', source: 'invoices.customerId', target: 'customers.id' },
      { id: 'item-invoice', type: 'many-to-one', source: 'invoiceItems.invoiceId', target: 'invoices.id' },
      { id: 'payment-invoice', type: 'many-to-one', source: 'invoicePayments.invoiceId', target: 'invoices.id' },
      { id: 'plan-product', type: 'many-to-one', source: 'plans.productId', target: 'products.id' },
      { id: 'dispute-transaction', type: 'many-to-one', source: 'disputes.id', target: 'transactions.referenceId' },
    ],
    expressions: [
      // Invoice calculated measures
      { id: 'invoices.netAmount', source: 'invoices', field: 'netAmount', isMeasure: true, expression: 'paidAmount - refundedAmount', format: 'currencyFormat' },
      { id: 'invoices.collectionRate', source: 'invoices', field: 'collectionRate', isMeasure: true, expression: 'paidAmount / total', format: 'percentageFormat' },
      { id: 'invoices.overdueShare', source: 'invoices', field: 'overdueShare', isMeasure: true, expression: 'overdueAmount / issuedAmount', format: 'percentageFormat' },
      { id: 'invoices.refundRate', source: 'invoices', field: 'refundRate', isMeasure: true, expression: 'refundedAmount / paidAmount', format: 'percentageFormat' },
      // Customer aggregates
      { id: 'customers.totalInvoiced', source: 'customers', field: 'totalInvoiced', isMeasure: true, expression: 'sum(invoices.issuedAmount)', format: 'currencyFormat' },
      { id: 'customers.totalPaid', source: 'customers', field: 'totalPaid', isMeasure: true, expression: 'sum(invoices.paidAmount)', format: 'currencyFormat' },
      { id: 'customers.totalOutstanding', source: 'customers', field: 'totalOutstanding', isMeasure: true, expression: 'sum(invoices.outstanding)', format: 'currencyFormat' },
      { id: 'customers.invoiceCount', source: 'customers', field: 'invoiceCount', isMeasure: true, expression: 'count(invoices.id)', format: 'textFormat' },
      { id: 'customers.disputeExposureRatio', source: 'customers', field: 'disputeExposureRatio', isMeasure: true, expression: 'sum(disputes.signedAmount) / sum(invoices.issuedAmount)', format: 'percentageFormat' },
      // Product aggregates
      { id: 'products.planCount', source: 'products', field: 'planCount', isMeasure: true, expression: 'count(plans.id)', format: 'textFormat' },
      { id: 'products.avgMonthlyPrice', source: 'products', field: 'avgMonthlyPrice', isMeasure: true, expression: 'avg(plans.monthlyPrice)', format: 'currencyFormat' },
      // Dispute measures
      { id: 'disputes.totalExposure', source: 'disputes', field: 'totalExposure', isMeasure: true, expression: 'sum(signedAmount)', format: 'currencyFormat' },
      { id: 'disputes.disputeCount', source: 'disputes', field: 'disputeCount', isMeasure: true, expression: 'count(id)', format: 'textFormat' },
    ],
    calendars: [
      {
        id: 'invoiceDate',
        label: 'Invoice Date',
        range: {
          from: { type: 'date', value: '2020-01-01' },
          to: { type: 'date', value: '2030-12-31' },
        },
        fragments: ['year', 'quarter', 'month', 'week', 'day', 'monthOfYear', 'dayOfWeek', 'weekOfMonth'],
      },
      {
        id: 'dueDate',
        label: 'Due Date',
        range: {
          from: { type: 'date', value: '2020-01-01' },
          to: { type: 'date', value: '2030-12-31' },
        },
        fragments: ['year', 'quarter', 'month', 'week', 'day', 'monthOfYear', 'dayOfWeek', 'weekOfMonth'],
      },
      {
        id: 'paymentDate',
        label: 'Payment Date',
        range: {
          from: { type: 'date', value: '2020-01-01' },
          to: { type: 'date', value: '2030-12-31' },
        },
        fragments: ['year', 'quarter', 'month', 'week', 'day', 'monthOfYear', 'dayOfWeek', 'weekOfMonth'],
      },
      {
        id: 'transactionDate',
        label: 'Transaction Date',
        range: {
          from: { type: 'date', value: '2020-01-01' },
          to: { type: 'date', value: '2030-12-31' },
        },
        fragments: ['year', 'quarter', 'month', 'week', 'day', 'monthOfYear', 'dayOfWeek', 'weekOfMonth'],
      },
      {
        id: 'disputeCreateDate',
        label: 'Dispute Created',
        range: {
          from: { type: 'date', value: '2020-01-01' },
          to: { type: 'date', value: '2030-12-31' },
        },
        fragments: ['year', 'quarter', 'month', 'week', 'day', 'monthOfYear', 'dayOfWeek', 'weekOfMonth'],
      },
    ],
  };
}

// Backwards compatible export
export function createDataSources(data: DashboardData) {
  const studio = buildStudioData(data);
  return {
    sources: studio.sources.map(s => ({ id: s.id, data: s.data })),
    relationships: studio.relationships,
    expressions: studio.expressions,
    calendars: studio.calendars,
  };
}