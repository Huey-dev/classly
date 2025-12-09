'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLucid } from '../../context/LucidContext';

export default function WalletPage() {
  const {
    walletAddress,
    balance,
    seedPhrase,
    connecting,
    loading,
    error,
    connectWallet,
    disconnectWallet,
    refreshBalance,
  } = useLucid();

  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'missing'>('idle');
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  /**
   * Copy wallet address to clipboard
   */
  const handleCopyAddress = async () => {
    if (!walletAddress || typeof navigator === 'undefined') {
      setCopyState('missing');
      setTimeout(() => setCopyState('idle'), 1500);
      return;
    }
    
    await navigator.clipboard.writeText(walletAddress);
    setCopyState('copied');
    setTimeout(() => setCopyState('idle'), 1500);
  };

  /**
   * Copy seed phrase to clipboard
   */
  const handleCopySeed = async () => {
    if (!seedPhrase || typeof navigator === 'undefined') return;
    
    await navigator.clipboard.writeText(seedPhrase);
    alert('⚠️ Seed phrase copied! Store it securely offline.');
  };

  /**
   * Reset wallet (dangerous action)
   */
  const confirmReset = () => {
    disconnectWallet();
    setShowResetModal(false);
    // Force page reload to reinitialize
    window.location.reload();
  };

  // Generate faucet URL for funding testnet wallet
  const faucetUrl = walletAddress
    ? `https://docs.cardano.org/cardano-testnets/tools/faucet/?address=${encodeURIComponent(walletAddress)}`
    : null;

  if (loading) {
    return (
      <div style={{ 
        maxWidth: 900, 
        margin: '0 auto', 
        padding: '24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '18px', color: '#6b7280' }}>Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px', display: 'grid', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '4px' }}>
            Wallet Management
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Local testnet wallet for Cardano Preprod network
          </p>
        </div>
        <Link 
          href="/student" 
          style={{ 
            color: '#2563eb', 
            fontWeight: 600,
            textDecoration: 'none'
          }}
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ 
          padding: '12px 16px', 
          borderRadius: '8px', 
          background: '#fef2f2', 
          color: '#b91c1c',
          border: '1px solid #fecaca'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Wallet Info Cards */}
      {walletAddress ? (
        <div style={{ 
          display: 'grid', 
          gap: '12px', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' 
        }}>
          {/* Address Card */}
          <div style={{ 
            padding: '20px', 
            border: '1px solid #e5e7eb', 
            borderRadius: '12px',
            background: '#ffffff'
          }}>
            <p style={{ fontWeight: 600, marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
              WALLET ADDRESS
            </p>
            <p style={{ 
              wordBreak: 'break-all', 
              color: '#111827',
              fontSize: '13px',
              fontFamily: 'monospace',
              marginBottom: '12px',
              lineHeight: '1.6'
            }}>
              {walletAddress}
            </p>
            <button
              onClick={handleCopyAddress}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                background: '#f9fafb',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                width: '100%'
              }}
            >
              {copyState === 'copied' ? '✓ Copied!' : '📋 Copy Address'}
            </button>
          </div>

          {/* Balance Card */}
          <div style={{ 
            padding: '20px', 
            border: '1px solid #e5e7eb', 
            borderRadius: '12px',
            background: '#ffffff'
          }}>
            <p style={{ 
              marginBottom: '8px', 
              fontWeight: 600,
              fontSize: '14px',
              color: '#6b7280'
            }}>
              BALANCE
            </p>
            <p style={{ 
              color: '#111827',
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '12px'
            }}>
              {balance != null ? `${balance.toFixed(6)} ADA` : '—'}
            </p>
            <button
              onClick={refreshBalance}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                background: '#f9fafb',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                width: '100%',
                marginBottom: '8px'
              }}
            >
              🔄 Refresh Balance
            </button>
            
            {faucetUrl && (
              <a
                href={faucetUrl}
                target="_blank"
                rel="noreferrer"
                style={{ 
                  display: 'block',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid #2563eb',
                  background: '#eff6ff',
                  color: '#2563eb',
                  textAlign: 'center',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                🚰 Get Test ADA from Faucet
              </a>
            )}
          </div>
        </div>
      ) : (
        /* Connect Prompt */
        <div style={{
          padding: '40px',
          border: '2px dashed #e5e7eb',
          borderRadius: '12px',
          textAlign: 'center',
          background: '#f9fafb'
        }}>
          <p style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            No Wallet Connected
          </p>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>
            Create or restore a local testnet wallet to get started
          </p>
          <button
            onClick={connectWallet}
            disabled={connecting}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              cursor: connecting ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 600,
              opacity: connecting ? 0.6 : 1
            }}
          >
            {connecting ? 'Connecting...' : '🔗 Connect Local Wallet'}
          </button>
        </div>
      )}

      {/* Wallet Actions */}
      {walletAddress && (
        <div style={{ 
          padding: '20px', 
          border: '1px solid #e5e7eb', 
          borderRadius: '12px',
          background: '#ffffff',
          display: 'grid', 
          gap: '12px' 
        }}>
          <p style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
            Wallet Actions
          </p>
          
          <button
            onClick={() => setShowSeedModal(true)}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #f59e0b',
              background: '#fffbeb',
              color: '#92400e',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            🔑 View Seed Phrase (Backup)
          </button>
          
          <button
            onClick={() => setShowResetModal(true)}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #ef4444',
              background: '#fef2f2',
              color: '#991b1b',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            ⚠️ Reset Wallet (Danger)
          </button>
        </div>
      )}

      {/* How to Fund Instructions */}
      {walletAddress && balance === 0 && (
        <div style={{
          padding: '20px',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          background: '#eff6ff'
        }}>
          <p style={{ fontWeight: 600, marginBottom: '8px', color: '#1e40af' }}>
            💡 How to Fund Your Wallet
          </p>
          <ol style={{ marginLeft: '20px', color: '#1e3a8a', lineHeight: '1.8' }}>
            <li>Copy your wallet address above</li>
            <li>Click "Get Test ADA from Faucet"</li>
            <li>Paste your address in the faucet website</li>
            <li>Request test ADA (you'll receive 1000 tADA)</li>
            <li>Wait 1-2 minutes and refresh your balance</li>
          </ol>
        </div>
      )}

      {/* Seed Phrase Modal */}
      {showSeedModal && seedPhrase && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%'
          }}>
            <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 600 }}>
              ⚠️ Your Seed Phrase
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
              Write this down and store it securely. Anyone with this phrase can access your wallet.
            </p>
            <div style={{
              padding: '16px',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              marginBottom: '16px',
              fontFamily: 'monospace',
              fontSize: '13px',
              wordBreak: 'break-word',
              lineHeight: '1.6'
            }}>
              {seedPhrase}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCopySeed}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: '#f9fafb',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                📋 Copy
              </button>
              <button
                onClick={() => setShowSeedModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%'
          }}>
            <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 600, color: '#ef4444' }}>
              ⚠️ Reset Wallet?
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
              This will permanently delete your current wallet and seed phrase. 
              Make sure you've backed up your seed phrase before proceeding.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowResetModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: '#f9fafb',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                Reset Wallet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}