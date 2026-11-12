'use client';

import NextDynamic from 'next/dynamic';

// Force dynamic rendering to avoid SSR/SSG issues with AG Studio
export const dynamic = 'force-dynamic';

// The entire AG Studio component will be loaded only on client side
// This avoids any SSR issues with AG Studio's browser-only code
const AgStudioClientOnly = NextDynamic(
  () => import('./AgStudioClient').then(mod => mod.AgStudioClient),
  { ssr: false, loading: () => <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white'}}>Loading AG Studio...</div> }
);

export default function AgStudioPage() {
  return (
    <div data-testid="ag-studio-container" style={{height: '100vh'}}>
      <AgStudioClientOnly />
    </div>
  );
}