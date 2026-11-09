import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/dashboard-data';

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json({ invoices: data.invoices });
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json({ invoices: [] }, { status: 500 });
  }
}