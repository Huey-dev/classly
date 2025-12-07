'use client';
import { ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Move the dynamic import HERE (not in layout.tsx)
const LucidProvider = dynamic(
  () => import('../../context/LucidContext').then(mod => ({ default: mod.LucidProvider })),
  { ssr: false }
);

interface ClientProviderWrapperProps {
  children: ReactNode;
}

export default function ClientProviderWrapper({ children }: ClientProviderWrapperProps) {
  return <LucidProvider>{children}</LucidProvider>;
}