import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/dashboard-data';
import { getAnomalyManifest } from '@/lib/demo-data';

export async function GET() {
  try {
    const data = await getDashboardData();
    const anomalyManifest = getAnomalyManifest();

    // Build AG Studio data sources format
    const sources = [
      {
        name: 'customers',
        fields: Object.keys(data.customers[0] || {}).map(k => ({ name: k, type: 'string' })),
        data: data.customers,
      },
      {
        name: 'invoices',
        fields: Object.keys(data.invoices[0] || {}).map(k => ({ name: k, type: 'string' })),
        data: data.invoices,
      },
      {
        name: 'invoiceItems',
        fields: Object.keys(data.invoiceItems[0] || {}).map(k => ({ name: k, type: 'string' })),
        data: data.invoiceItems,
      },
      {
        name: 'invoicePayments',
        fields: Object.keys(data.invoicePayments[0] || {}).map(k => ({ name: k, type: 'string' })),
        data: data.invoicePayments,
      },
      {
        name: 'products',
        fields: Object.keys(data.products[0] || {}).map(k => ({ name: k, type: 'string' })),
        data: data.products,
      },
      {
        name: 'plans',
        fields: Object.keys(data.plans[0] || {}).map(k => ({ name: k, type: 'string' })),
        data: data.plans,
      },
      {
        name: 'transactions',
        fields: Object.keys(data.transactions[0] || {}).map(k => ({ name: k, type: 'string' })),
        data: data.transactions,
      },
      {
        name: 'payouts',
        fields: Object.keys(data.payouts[0] || {}).map(k => ({ name: k, type: 'string' })),
        data: data.payouts,
      },
      {
        name: 'balances',
        fields: Object.keys(data.balances[0] || {}).map(k => ({ name: k, type: 'string' })),
        data: data.balances,
      },
      {
        name: 'disputes',
        fields: Object.keys(data.disputes[0] || {}).map(k => ({ name: k, type: 'string' })),
        data: data.disputes,
      },
    ];

    const relationships = [
      { from: 'invoices', field: 'customerId', to: 'customers', toField: 'id', type: 'many-to-one' },
      { from: 'invoiceItems', field: 'invoiceId', to: 'invoices', toField: 'id', type: 'many-to-one' },
      { from: 'invoicePayments', field: 'invoiceId', to: 'invoices', toField: 'id', type: 'many-to-one' },
      { from: 'products', field: 'id', to: 'plans', toField: 'productId', type: 'one-to-many' },
      { from: 'transactions', field: 'invoiceId', to: 'invoices', toField: 'id', type: 'many-to-one' },
      { from: 'payouts', field: 'transactionId', to: 'transactions', toField: 'id', type: 'many-to-one' },
      { from: 'balances', field: 'currency', to: 'transactions', toField: 'currency', type: 'one-to-many' },
      { from: 'disputes', field: 'invoiceId', to: 'invoices', toField: 'id', type: 'many-to-one' },
    ];

    return NextResponse.json({
      sources,
      relationships,
      expressions: [],
      calendars: [],
      anomalies: anomalyManifest?.anomalies || [],
    });
  } catch (error) {
    console.error('Failed to fetch AG Studio data:', error);
    return NextResponse.json({ sources: [], relationships: [], expressions: [], calendars: [], anomalies: [] }, { status: 500 });
  }
}