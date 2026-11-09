import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/dashboard-data';

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json({ balances: data.balances });
  } catch (error) {
    console.error('Failed to fetch balances:', error);
    return NextResponse.json({ balances: [] }, { status: 500 });
  }
}