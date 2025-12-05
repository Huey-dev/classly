// ========================================
// WALLET CREATION & MANAGEMENT
// lib/wallet-creation.ts
// ========================================

import { 
  Lucid, 
  Blockfrost, 
  generateSeedPhrase, 
  generatePrivateKey 
} from '@lucid-evolution/lucid';

export interface WalletInfo {
  seedPhrase: string;
  address: string;
  privateKey: string;
}

/**
 * Generate a new Cardano wallet with seed phrase
 */
export async function generateNewWallet(): Promise<WalletInfo> {
  try {
    // Initialize Lucid (Lucid is now a function, not Lucid.new)
    const lucid = await Lucid(
      new Blockfrost(
        `https://cardano-preview.blockfrost.io/api/v0`,
        process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY!
      ),
      'Preview'
    );

    // Generate seed phrase (24 words)
    const seedPhrase = generateSeedPhrase();

    // Select wallet from seed
    lucid.selectWallet.fromSeed(seedPhrase);

    // Get address
    const address = await lucid.wallet().address();

    // Generate private key from seed
    const privateKey = generatePrivateKey();

    console.log('✅ New wallet generated');
    console.log(`📍 Address: ${address}`);

    return {
      seedPhrase,
      address,
      privateKey,
    };
  } catch (error) {
    console.error('❌ Failed to generate wallet:', error);
    throw new Error('Failed to generate wallet');
  }
}

/**
 * Save wallet info to localStorage (encrypted recommended in production)
 */
export function saveWalletToStorage(walletInfo: WalletInfo): void {
  try {
    // WARNING: This is for demo only. In production, encrypt the seed phrase!
    if (typeof window === 'undefined') {
      throw new Error('localStorage only available in browser');
    }
    localStorage.setItem('wallet_info', JSON.stringify(walletInfo));
    console.log('💾 Wallet saved to local storage');
  } catch (error) {
    console.error('❌ Failed to save wallet:', error);
  }
}

/**
 * Load wallet from localStorage
 */
export function loadWalletFromStorage(): WalletInfo | null {
  try {
    if (typeof window === 'undefined') {
      return null;
    }
    const stored = localStorage.getItem('wallet_info');
    if (!stored) return null;

    const walletInfo = JSON.parse(stored) as WalletInfo;
    console.log('📂 Wallet loaded from storage');
    return walletInfo;
  } catch (error) {
    console.error('❌ Failed to load wallet:', error);
    return null;
  }
}

/**
 * Delete wallet from storage
 */
export function deleteWalletFromStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('wallet_info');
  console.log('🗑️  Wallet deleted from storage');
}

/**
 * Restore wallet from seed phrase
 */
export async function restoreWalletFromSeed(seedPhrase: string): Promise<WalletInfo> {
  try {
    // Validate seed phrase (should be 24 words)
    const words = seedPhrase.trim().split(' ');
    if (words.length !== 24) {
      throw new Error('Seed phrase must be exactly 24 words');
    }

    // Initialize Lucid
    const lucid = await Lucid(
      new Blockfrost(
        `https://cardano-preview.blockfrost.io/api/v0`,
        process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY!
      ),
      'Preview'
    );

    // Select wallet from seed
    lucid.selectWallet.fromSeed(seedPhrase);

    // Get address
    const address = await lucid.wallet().address();

    console.log('✅ Wallet restored');
    console.log(`📍 Address: ${address}`);

    return {
      seedPhrase,
      address,
      privateKey: '', // Not needed for restoration
    };
  } catch (error) {
    console.error('❌ Failed to restore wallet:', error);
    throw new Error('Failed to restore wallet. Check your seed phrase.');
  }
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(address: string): Promise<{
  lovelace: bigint;
  ada: number;
}> {
  try {
    const lucid = await Lucid(
      new Blockfrost(
        `https://cardano-preview.blockfrost.io/api/v0`,
        process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY!
      ),
      'Preview'
    );

    const utxos = await lucid.utxosAt(address);
    
    let lovelace = BigInt(0);
    for (const utxo of utxos) {
      lovelace += utxo.assets.lovelace;
    }

    const ada = Number(lovelace) / 1_000_000;

    return { lovelace, ada };
  } catch (error) {
    console.error('❌ Failed to get balance:', error);
    return { lovelace: BigInt(0), ada: 0 };
  }
}

/**
 * Request test ADA from faucet (opens in new tab)
 */
export function requestTestADA(address: string): void {
  if (typeof window === 'undefined') return;
  
  const faucetUrl = `https://docs.cardano.org/cardano-testnets/tools/faucet/`;
  
  // Copy address to clipboard
  if (navigator.clipboard) {
    navigator.clipboard.writeText(address);
    console.log('📋 Address copied to clipboard');
  }
  
  // Open faucet in new tab
  window.open(faucetUrl, '_blank');
  
  alert(
    `Your address has been copied to clipboard!\n\n` +
    `Address: ${address}\n\n` +
    `The faucet page will open. Paste your address and request test ADA.`
  );
}

/**
 * Check if wallet has sufficient balance
 */
export async function hasSufficientBalance(
  address: string,
  requiredLovelace: bigint
): Promise<boolean> {
  const { lovelace } = await getWalletBalance(address);
  return lovelace >= requiredLovelace;
}