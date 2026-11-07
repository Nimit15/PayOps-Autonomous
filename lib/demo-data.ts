// Demo Data Loader - Loads generated dataset for judge scenarios and offline mode
// Provides 250-transaction multi-currency dataset with 18 planted anomalies

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { DashboardData } from './dashboard-data';

const DATA_DIR = join(process.cwd(), 'data', 'generated');

interface GeneratedDataset {
  customers: any[];
  invoices: any[];
  invoiceItems: any[];
  invoicePayments: any[];
  products: any[];
  plans: any[];
  transactions: any[];
  payouts: any[];
  balances: any[];
  disputes: any[];
  anomalies: any[];
}

let cachedDataset: GeneratedDataset | null = null;

function loadDataset(): GeneratedDataset {
  if (cachedDataset) return cachedDataset;

  const filePath = join(DATA_DIR, 'full-dataset.json');
  if (!existsSync(filePath)) {
    throw new Error('Generated dataset not found. Run `npx tsx scripts/generate-dataset.ts` first.');
  }

  const content = readFileSync(filePath, 'utf-8');
  cachedDataset = JSON.parse(content);
  return cachedDataset!;
}

export function getDemoDashboardData(asOf = new Date()): DashboardData {
  const dataset = loadDataset();

  // Transform generated data to DashboardData format
  const today = asOf.toISOString().slice(0, 10);

  // Customers are already in correct format
  const customers = dataset.customers.map(c => ({
    ...c,
    totalInvoiced: c.totalInvoiced || 0,
    totalPaid: c.totalPaid || 0,
    totalOutstanding: c.totalOutstanding || 0,
    invoiceCount: c.invoiceCount || 0,
  }));

  // Invoices
  const invoices = dataset.invoices.map(inv => ({
    ...inv,
    status: inv.status,
    statusGroup: inv.statusGroup,
    currency: inv.currency,
    netCollected: inv.netCollected ?? round2(inv.paidAmount - inv.refundedAmount),
  }));

  // Invoice Items
  const invoiceItems = dataset.invoiceItems.map(item => ({
    ...item,
    gross: item.gross,
    discount: item.discount,
    tax: item.tax,
    lineTotal: item.lineTotal,
  }));

  // Invoice Payments
  const invoicePayments = dataset.invoicePayments.map(p => ({
    ...p,
    signedAmount: p.kind === 'Refund' ? -Math.abs(p.signedAmount) : Math.abs(p.signedAmount),
  }));

  // Products
  const products = dataset.products.map(p => ({
    ...p,
    planCount: p.planCount || 0,
    avgMonthlyPrice: p.avgMonthlyPrice || 0,
  }));

  // Plans
  const plans = dataset.plans.map(p => ({
    ...p,
    monthlyPrice: p.monthlyPrice || 0,
  }));

  // Transactions
  const transactions = dataset.transactions.map(t => ({
    ...t,
    net: t.net,
    endingBalance: t.endingBalance,
  }));

  // Payouts
  const payouts = dataset.payouts.map(p => ({
    ...p,
    amount: p.amount,
    fee: p.fee,
  }));

  // Balances
  const balances = dataset.balances.map(b => ({
    ...b,
    total: b.total,
    available: b.available,
    withheld: b.withheld,
  }));

  // Disputes
  const disputes = dataset.disputes.map(d => ({
    ...d,
    signedAmount: d.signedAmount,
  }));

  return {
    asOf: asOf.toISOString(),
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
  };
}

export function getAnomalyManifest() {
  const filePath = join(DATA_DIR, 'anomaly-manifest.json');
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export function getTableData(table: keyof GeneratedDataset) {
  const dataset = loadDataset();
  return dataset[table];
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
}

const round2 = (n: number) => Math.round(n * 100) / 100;