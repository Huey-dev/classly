// ========================================
// PAGE WRAPPER (Client-side only loader)
// Location: src/app/student/page.tsx
// ========================================

'use client';

import dynamic from 'next/dynamic';
import ClientLayout from '../component/ClientLayout';

// Dynamic import with SSR disabled - this prevents server-side rendering
const StudentDashboard = dynamic(
  () => import('./StudentDashboard'),
  { 
    ssr: false, // Critical: prevents server-side rendering
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Loading Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">Initializing Cardano wallet...</p>
        </div>
      </div>
    )
  }
);

export default function StudentPage() {
  return (
    <ClientLayout>
      <StudentDashboard />
    </ClientLayout>
  );
}