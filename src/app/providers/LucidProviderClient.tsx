'use client';

import { ReactNode } from 'react';
import { LucidProvider } from '../context/LucidContext';

export default function LucidProviderClient({ children }: { children: ReactNode }) {
  return <LucidProvider>{children}</LucidProvider>;
}
