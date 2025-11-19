
import { useState, useEffect } from 'react';


export default function WalletConnector() {
  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('0.000000');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const BF_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;
  const STORAGE_KEY = 'classly_dev_wallet_seed';

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
        const lucid = await Lucid(new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", BF_KEY || ""), "Preprod");

        // Select wallet from seed
        lucid.selectWallet.fromSeed(seed);

        // Get address
        const addr = await lucid.wallet().address();
        setAddress(addr);

        // Get balance
        try {
          const utxos = await lucid.wallet().getUtxos();
          const total = utxos.reduce((sum, u) => sum + BigInt(u.assets.lovelace || 0), BigInt(0));
          setBalance((Number(total) / 1_000_000).toFixed(6));
        } catch {
          setBalance("0.000000");
        }

        setLoading(false);
      } catch (err) {
        setError(String(err));
        setLoading(false);
      }
    })();
  }, [BF_KEY]);

  // Function to reset wallet (generate new one)
  function resetWallet() {
    if (confirm("⚠️ This will generate a NEW wallet. You'll lose access to this one unless you saved the seed phrase. Continue?")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '50px' }}>
        <h2>🔄 Loading wallet...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '50px', color: 'red' }}>
        <h2>❌ Error</h2>
        <pre>{error}</pre>
      </div>
    );
  }

  return (
    <div style={{ padding: '50px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🚀 Classly Development Wallet</h1>
      
      <div style={{ 
        backgroundColor: '#fef3c7', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: '2px solid #fbbf24'
      }}>
        <p><strong>⚠️ IMPORTANT:</strong></p>
        <p style={{ marginTop: '5px', fontSize: '14px' }}>
          This wallet persists in your browser. Same address every time you refresh!
        </p>
      </div>

      <div style={{ 
        backgroundColor: '#f3f4f6', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px',
        wordBreak: 'break-all'
      }}>
        <p><strong>🌱 Seed Phrase:</strong></p>
        <p style={{ 
          fontFamily: 'monospace', 
          fontSize: '13px',
          color: '#dc2626',
          padding: '10px',
          backgroundColor: '#fee2e2',
          borderRadius: '4px',
          marginTop: '10px'
        }}>
          {seedPhrase}
        </p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(seedPhrase);
            alert('✅ Seed copied! Save it somewhere safe!');
          }}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          📋 Copy Seed Phrase
        </button>
      </div>

      <div style={{ 
        backgroundColor: '#f3f4f6', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <p><strong>🏠 Address:</strong></p>
        <p style={{ 
          fontFamily: 'monospace', 
          fontSize: '13px',
          wordBreak: 'break-all',
          padding: '10px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          marginTop: '10px'
        }}>
          {address}
        </p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(address);
            alert('✅ Address copied!');
          }}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          📋 Copy Address
        </button>
      </div>

      <div style={{ 
        backgroundColor: '#f3f4f6', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <p><strong>💰 Balance:</strong> {balance} tADA</p>
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
                fontWeight: 'bold'
              }}
            >
              🚰 Request Test ADA from Faucet
            </a>
          </div>
        )}
      </div>

      <div style={{ 
        backgroundColor: '#fee2e2', 
        padding: '15px', 
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <p><strong>🗑️ Reset Wallet</strong></p>
        <p style={{ fontSize: '14px', marginTop: '5px', marginBottom: '10px' }}>
          Generate a completely new wallet (you'll lose access to this one)
        </p>
        <button
          onClick={resetWallet}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🔄 Generate New Wallet
        </button>
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#dbeafe', borderRadius: '8px' }}>
        <p><strong>📝 How This Works:</strong></p>
        <ol style={{ marginTop: '10px', paddingLeft: '20px', fontSize: '14px' }}>
          <li>First load: Generates new 24-word seed phrase</li>
          <li>Seed saved in browser localStorage</li>
          <li>Every refresh: Uses SAME seed = SAME address</li>
          <li>Send test ADA to this address</li>
          <li>Balance persists across refreshes</li>
        </ol>
      </div>
    </div>
  );
}