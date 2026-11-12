'use client';

import { CommandCenterProvider } from '@/apps/web/src/components/CommandCenter';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return <CommandCenterProvider>{children}</CommandCenterProvider>;
}