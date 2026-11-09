// Sandbox Data Seeder API - 1-click "Seed Sandbox Data" for judges
// POST /api/sandbox/seed - triggers full sandbox population

import { NextRequest, NextResponse } from 'next/server';
import { seedSandboxData } from '@/lib/sandbox-seeder';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Optional: Add simple auth check for production
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.SEEDER_SECRET}`) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  try {
    console.log('🌱 Sandbox seeding triggered via API');
    const result = await seedSandboxData();

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error('Seeder API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: `API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: 'Sandbox Seeder API',
    usage: 'POST to trigger sandbox data seeding',
    description: 'Populates PayPal Sandbox with products, plans, invoices, orders, and subscriptions for judge demos',
  });
}