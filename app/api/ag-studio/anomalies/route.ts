import { NextResponse } from 'next/server';
import { getAnomalyManifest } from '@/lib/demo-data';

export async function GET() {
  try {
    const manifest = getAnomalyManifest();
    if (!manifest) {
      return NextResponse.json({ anomalies: [] });
    }
    // Transform manifest into anomalies array
    const anomalies = manifest.anomalies || [];
    return NextResponse.json({ anomalies });
  } catch (error) {
    console.error('Failed to fetch anomalies:', error);
    return NextResponse.json({ anomalies: [] }, { status: 500 });
  }
}