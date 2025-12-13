// ========================================
// PAGE WRAPPER (Client-side only loader)
// Location: src/app/student/page.tsx
// ========================================

'use client';

import dynamic from 'next/dynamic';
import ClientLayout from '../component/ClientLayout';
import InvestorDemoDashboard from './InvestorDemoDashboard';
import { Suspense } from 'react';
import { NftMintScaffold } from './NftMintScaffold';

const StudentDashboard = dynamic(() => import('./component/StudentDashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center max-w-md">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Loading Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400">Initializing Cardano wallet...</p>
      </div>
    </div>
  ),
});

export default function DashboardPage() {
  return (
    <ClientLayout>
      <div className="space-y-8">
        <StudentDashboard />
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden">
          <Suspense
            fallback={
              <div className="p-6 text-sm text-gray-500 dark:text-gray-300">Loading on-chain data...</div>
            }
          >
            <InvestorDemoDashboard />
          </Suspense>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden">
          <div className="border-b px-6 py-4">
            <h2 className="text-xl font-semibold">Completion NFT (stub flow)</h2>
            <p className="text-sm text-gray-500">Configure and dry-run the NFT mint preparation flow.</p>
          </div>
          <NftMintScaffold />
        </div>
      </div>
    </ClientLayout>
  );
}
