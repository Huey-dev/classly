// src/app/wallet-test/page.tsx
import dynamic from 'next/dynamic';

const WalletConnector = dynamic(
  () => import('@/app/component/WalletConector/page'), 
  { 
    ssr: false, // FIX IS HERE
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


