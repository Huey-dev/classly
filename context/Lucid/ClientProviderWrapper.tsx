'use client';
import { LucidProvider } from '../../src/app/context/LucidContext'
import { ReactNode } from 'react';
interface ClientProviderWrapperProps {
  children: ReactNode;
}
export default function ClientProviderWrapper({ children }: ClientProviderWrapperProps) {
  return <LucidProvider>{children}</LucidProvider>;
}