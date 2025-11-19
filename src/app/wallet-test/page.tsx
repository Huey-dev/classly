'use client';
import dynamic from 'next/dynamic';

const WalletConnector = dynamic(
  () => import('@/app/component/WalletConnector'), 
  { 
    ssr: false, 
    loading: () => <p>Connecting to Cardano Wallet...</p>
  }
);

export default function WalletTestPage() {
  return (
    <div>
      <h1>Cardano Wallet Test</h1>
      <WalletConnector />
    </div>
  );
}
