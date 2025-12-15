'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamic import to avoid SSR issues with Lucid
const EscrowWithdrawalDashboard = dynamic(
  () => import('../../withdraw/EscrowWithdrawalDashboard'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    ),
  }
);

export default function CourseEscrowPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EscrowWithdrawalDashboard />
    </Suspense>
  );
}