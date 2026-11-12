import { NextResponse } from 'next/server';
import { getDemoDashboardData } from '@/lib/demo-data';

export async function GET() {
  try {
    const data = await getDemoDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch Gantt demo data:', error);
    return NextResponse.json(
      { customers: [], invoices: [], invoiceItems: [], invoicePayments: [], products: [], plans: [], transactions: [], payouts: [], balances: [], disputes: [] },
      { status: 500 }
    );
  }
}