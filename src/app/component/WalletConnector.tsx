'use client';
import { useState, useEffect } from 'react';
import type { LucidEvolution, Lucid as LucidInstance } from '@lucid-evolution/lucid' 

// Utility to copy text to clipboard without using navigator.clipboard
// This is often required in sandbox environments where direct clipboard access is restricted
function copyToClipboard(text: string) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
}

export default function WalletConnector() {
  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('0.000000');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'warning' | 'error' } | null>(null);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [lucidInstance, setLucidInstance] = useState<LucidEvolution | null>(null);


  const BF_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;
  const STORAGE_KEY = 'classly_dev_wallet_seed';

  // State management for custom alert/message
  const displayMessage = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // 🚨 IMPORTANT: Replace window.confirm with a modal
  function handleResetConfirmation() {
    setShowResetModal(true);
  }

  // 🚨 IMPORTANT: Replace window.alert with a custom message
  function handleCopySeed() {
    copyToClipboard(seedPhrase);
    displayMessage('Seed copied! Save it somewhere safe!', 'warning');
  }
  
  function handleCopyAddress() {
    copyToClipboard(address);
    displayMessage('Address copied!', 'success');
  }

  function confirmReset() {
    localStorage.removeItem(STORAGE_KEY);
    setShowResetModal(false);
    // Reload to regenerate new wallet
    window.location.reload(); 
  }

  useEffect(() => {
    (async () => {
      try {
        // Dynamic import Lucid and related modules
        const { Lucid, Blockfrost, generateSeedPhrase } = await import('@lucid-evolution/lucid');

        // Check if we already have a seed saved
        let seed = localStorage.getItem(STORAGE_KEY);
        if (!seed) {
          seed = generateSeedPhrase();
          localStorage.setItem(STORAGE_KEY, seed);
          console.log("🆕 Generated NEW wallet");
        } else {
          console.log("♻️ Loaded EXISTING wallet");
        }

        setSeedPhrase(seed);

        // Initialize Lucid
        const lucid = await Lucid(new Blockfrost("https://cardano-preview.blockfrost.io/api/v0", BF_KEY || ""), "Preview");
        setLucidInstance(lucid); // Save instance if needed for future tx

        // Select wallet from seed
        lucid.selectWallet.fromSeed(seed);

        // Get address
        const addr = await lucid.wallet().address();
        setAddress(addr);

        // Get balance
        try {
          // Note: using lucid.wallet().getLovelace() is simpler if available, but this works:
          const utxos = await lucid.wallet().getUtxos();
          const total = utxos.reduce((sum, u) => sum + BigInt(u.assets.lovelace || 0), BigInt(0));
          setBalance((Number(total) / 1_000_000).toFixed(6));
        } catch (e) {
          console.error("Error fetching balance:", e);
          setBalance("0.000000");
        }

        setLoading(false);
      } catch (err) {
        setError(String(err));
        setLoading(false);
      }
    })();
  }, [BF_KEY]);

  if (loading) {
    return (
      <div style={{ padding: '50px', backgroundColor: '#fff' }}>
        <h2>🔄 Connecting to Cardano Testnet...</h2>
        <p>This involves loading WebAssembly and Blockfrost data.</p>
      </div>
    );
  }

  // Helper to determine message box style
  const getMessageStyle = (type: 'success' | 'warning' | 'error') => {
      switch (type) {
          case 'success': return { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #34d399' };
          case 'warning': return { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' };
          case 'error': return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171' };
      }
  };


  if (error) {
    return (
      <div style={{ padding: '50px', backgroundColor: '#fff' }}>
        <h2>❌ Wallet Error</h2>
        <p>Could not initialize Cardano wallet. Check Blockfrost key.</p>
        <pre style={{ whiteSpace: 'pre-wrap', color: 'red', marginTop: '10px', fontSize: '12px' }}>{error}</pre>
      </div>
    );
  }

  return (
    <div style={{ 
        padding: '50px', 
        maxWidth: '800px', 
        margin: '0 auto', 
        fontFamily: 'sans-serif',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        borderRadius: '12px'
    }}>
      <h1 style={{ fontSize: '28px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px' }}>
        🚀 Classly Development Wallet
      </h1>

      {/* Custom Message Alert */}
      {message && (
        <div 
            style={{ 
                ...getMessageStyle(message.type), 
                padding: '12px', 
                borderRadius: '6px', 
                marginBottom: '20px', 
                fontWeight: 'bold' 
            }}
        >
          {message.text}
        </div>
      )}

      <div style={{ 
        backgroundColor: '#fef3c7', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: '2px solid #fbbf24'
      }}>
        <p><strong>⚠️ IMPORTANT:</strong></p>
        <p style={{ marginTop: '5px', fontSize: '14px' }}>
          This wallet is for **Preprod Testnet**. The seed persists in your browser's local storage.
        </p>
      </div>

      <SectionCard title="🌱 Seed Phrase" color="#f3f4f6">
        <CodeBlock content={seedPhrase} color="#fee2e2" textColor="#dc2626" />
        <Button onClick={handleCopySeed} color="#dc2626">
          📋 Copy Seed Phrase
        </Button>
      </SectionCard>

      <SectionCard title="🏠 Address" color="#f3f4f6">
        <CodeBlock content={address} color="#e5e7eb" textColor="#374151" />
        <Button onClick={handleCopyAddress} color="#6366f1">
          📋 Copy Address
        </Button>
      </SectionCard>

      <SectionCard title={`💰 Balance: ${balance} tADA`} color="#f3f4f6">
        {balance === "0.000000" && (
          <div style={{ marginTop: '15px' }}>
            <a 
              href={`https://docs.cardano.org/cardano-testnets/tools/faucet/?address=${address}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#10b981',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                transition: 'background-color 0.2s'
              }}
            >
              🚰 Request Test ADA from Faucet
            </a>
          </div>
        )}
      </SectionCard>

      <SectionCard title="🗑️ Reset Wallet" color="#fee2e2">
        <p style={{ fontSize: '14px', marginBottom: '10px' }}>
          Generate a completely new wallet (you'll lose access to this one permanently).
        </p>
        <Button onClick={handleResetConfirmation} color="#dc2626">
          🔄 Generate New Wallet
        </Button>
      </SectionCard>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <Modal title="Confirm Wallet Reset" onClose={() => setShowResetModal(false)}>
          <p>⚠️ **WARNING:** This action is irreversible. You will lose access to the current wallet and any funds in it unless you have saved the seed phrase.</p>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowResetModal(false)} color="#6b7280">Cancel</Button>
            <Button onClick={confirmReset} color="#dc2626">Yes, Reset Wallet</Button>
          </div>
        </Modal>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#dbeafe', borderRadius: '8px' }}>
        <p style={{ fontWeight: 'bold' }}>📝 How This Works:</p>
        <ol style={{ marginTop: '10px', paddingLeft: '20px', fontSize: '14px' }}>
          <li>First load: Dynamically imports Lucid and generates a new 24-word seed phrase.</li>
          <li>Seed is saved in browser `localStorage`.</li>
          <li>Every refresh: Uses the SAME seed = SAME Cardano address.</li>
          <li>Sends test ADA to this address to work with the Preprod Testnet.</li>
        </ol>
      </div>
    </div>
  );
}


// --- Helper Components for clean JSX ---

const SectionCard = ({ title, children, color }: { title: string, children: React.ReactNode, color: string }) => (
    <div style={{ 
      backgroundColor: color, 
      padding: '20px', 
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      <h3 style={{ fontSize: '18px', marginBottom: '15px', fontWeight: '600' }}>{title}</h3>
      {children}
    </div>
);

const CodeBlock = ({ content, color, textColor }: { content: string, color: string, textColor: string }) => (
    <p style={{ 
        fontFamily: 'monospace', 
        fontSize: '13px',
        wordBreak: 'break-all',
        color: textColor,
        padding: '10px',
        backgroundColor: color,
        borderRadius: '4px',
        marginTop: '10px',
        marginBottom: '15px'
    }}>
        {content}
    </p>
);

const Button = ({ onClick, children, color }: { onClick: () => void, children: React.ReactNode, color: string }) => (
    <button
        onClick={onClick}
        style={{
            marginTop: '10px',
            padding: '10px 20px',
            backgroundColor: color,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'background-color 0.2s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
    >
        {children}
    </button>
);

const Modal = ({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) => (
    <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000 // Ensure it's on top
    }}>
        <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)'
        }}>
            <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '20px' }}>{title}</h3>
            {children}
            <button 
                onClick={onClose} 
                style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    right: '10px', 
                    background: 'none', 
                    border: 'none', 
                    fontSize: '20px', 
                    cursor: 'pointer' 
                }}>
                &times;
            </button>
        </div>
    </div>
);