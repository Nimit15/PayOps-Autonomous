'use client';

import NextDynamic from 'next/dynamic';

// Force dynamic rendering to avoid SSR/SSG issues with Bryntum
export const dynamic = 'force-dynamic';

// The entire Gantt component will be loaded only on client side
// This avoids any SSR issues with Bryntum's browser-only code
const GanttClientOnly = NextDynamic(
  () => import('./GanttClient').then(mod => mod.GanttClient),
  { ssr: false, loading: () => <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white'}}>Loading PayOps Gantt...</div> }
);

export default function GanttPage() {
  return <GanttClientOnly />;
}