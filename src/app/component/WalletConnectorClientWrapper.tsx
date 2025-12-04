'use client';
import dynamic from 'next/dynamic';

const WalletConnector = dynamic(
  () => import('../component/WalletConnector'),
  { ssr: false, loading: () => <p>Connecting to Cardano Wallet..</p> }
);

export default function WalletConnectorClientWrapper() {
  return <WalletConnector />;
}
