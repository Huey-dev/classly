import type { LucidEvolution } from '@lucid-evolution/lucid';

/**
 * Initialize Lucid with Blockfrost provider
 * Can be used with an external wallet API or standalone
 */
export async function getLucid(walletApi?: any): Promise<LucidEvolution> {
  const blockfrostApiKey = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || process.env.NEXT_PUBLIC_BLOCKFROST_KEY;
  
  if (!blockfrostApiKey) {
    throw new Error(
      'NEXT_PUBLIC_BLOCKFROST_API_KEY is not set. Please add it to your .env.local file'
    );
  }

  console.log('🔧 Initializing Lucid with Blockfrost...');
  console.log('📍 API Key found:', blockfrostApiKey.substring(0, 10) + '...');

  const { Lucid, Blockfrost } = await import('@lucid-evolution/lucid');

  // HARDCODED TO PREPROD - Change this if you need Preview
  const network = 'Preprod';
  const blockfrostUrl = 'https://cardano-preprod.blockfrost.io/api/v0';

  console.log('🌐 Network:', network);
  console.log('🔗 Blockfrost URL:', blockfrostUrl);

  // Initialize Lucid with Blockfrost provider
  const lucid = await Lucid(
    new Blockfrost(blockfrostUrl, blockfrostApiKey),
    network
  );

  console.log('✅ Lucid instance created successfully');

  // If a wallet API is provided (e.g., from Nami, Eternl), connect it
  if (walletApi) {
    lucid.selectWallet.fromAPI(walletApi);
  }

  return lucid;
}

/**
 * Initialize Lucid from a seed phrase (for development/testing)
 */
export async function getLucidFromSeed(seedPhrase: string): Promise<LucidEvolution> {
  const blockfrostApiKey = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || process.env.NEXT_PUBLIC_BLOCKFROST_KEY;
  
  if (!blockfrostApiKey) {
    throw new Error(
      'NEXT_PUBLIC_BLOCKFROST_API_KEY is not set. Please add it to your .env.local file'
    );
  }

  console.log('🔧 Initializing Lucid from seed phrase...');
  console.log('📍 API Key found:', blockfrostApiKey.substring(0, 10) + '...');

  const { Lucid, Blockfrost } = await import('@lucid-evolution/lucid');

  // HARDCODED TO PREPROD - Change this if you need Preview
  const network = 'Preprod';
  const blockfrostUrl = 'https://cardano-preprod.blockfrost.io/api/v0';

  console.log('🌐 Network:', network);
  console.log('🔗 Blockfrost URL:', blockfrostUrl);

  try {
    const lucid = await Lucid(
      new Blockfrost(blockfrostUrl, blockfrostApiKey),
      network
    );

    console.log('✅ Lucid instance created');

    // Select wallet from seed phrase
    lucid.selectWallet.fromSeed(seedPhrase);
     
    console.log('✅ Wallet selected from seed phrase');

    return lucid;
  } catch (error: any) {
    console.error('❌ Failed to initialize Lucid:', error);
    console.error('Error details:', error?.message, error?.stack);
    throw error;
  }
}

/**
 * Get wallet balance from UTXOs
 * Returns both lovelace and all native assets
 */
export async function getWalletBalance(lucid: LucidEvolution): Promise<{
  lovelace: bigint;
  ada: number;
  assets: Record<string, bigint>;
}> {
  try {
    const utxos = await lucid.wallet().getUtxos();
    
    let lovelace = BigInt(0);
    const assets: Record<string, bigint> = {};
    
    // Sum up all UTXOs
    for (const utxo of utxos) {
      // Add lovelace
      if (utxo.assets?.lovelace) {
        const lovelaceValue = utxo.assets.lovelace;
        if (typeof lovelaceValue === 'bigint') {
          lovelace += lovelaceValue;
        } else if (typeof lovelaceValue === 'string') {
          lovelace += BigInt(lovelaceValue);
        } else if (typeof lovelaceValue === 'number') {
          lovelace += BigInt(lovelaceValue);
        }
      }
      
      // Add native assets (tokens, NFTs)
      for (const [unit, amount] of Object.entries(utxo.assets || {})) {
        if (unit === 'lovelace') continue;
        
        const amountBigInt = typeof amount === 'bigint' 
          ? amount 
          : BigInt(amount);
        
        assets[unit] = (assets[unit] || BigInt(0)) + amountBigInt;
      }
    }
    
    return { 
      lovelace, 
      ada: lovelaceToAda(lovelace),
      assets 
    };
  } catch (error) {
    console.error('Failed to get wallet balance:', error);
    throw error;
  }
}

/**
 * Get balance in real-time with polling
 * Useful for updating UI after transactions
 */
export function watchBalance(
  lucid: LucidEvolution,
  callback: (balance: { lovelace: bigint; ada: number; assets: Record<string, bigint> }) => void,
  intervalMs: number = 5000 // Poll every 5 seconds by default
): () => void {
  let isActive = true;
  
  const poll = async () => {
    while (isActive) {
      try {
        const balance = await getWalletBalance(lucid);
        callback(balance);
      } catch (error) {
        console.error('Balance polling error:', error);
      }
      
      // Wait for the interval
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  };
  
  // Start polling
  poll();
  
  // Return cleanup function to stop polling
  return () => {
    isActive = false;
  };
}

/**
 * Helper to convert lovelace (smallest unit) to ADA
 */
export function lovelaceToAda(lovelace: bigint | number | string): number {
  const value = typeof lovelace === 'bigint' 
    ? lovelace 
    : BigInt(lovelace);
  return Number(value) / 1_000_000;
}

/**
 * Helper to convert ADA to lovelace
 */
export function adaToLovelace(ada: number): bigint {
  return BigInt(Math.floor(ada * 1_000_000));
}

/**
 * Format asset name from policy ID + asset name
 */
export function formatAssetUnit(policyId: string, assetName: string): string {
  return policyId + assetName;
}

/**
 * Parse asset unit into policy ID and asset name
 */
export function parseAssetUnit(unit: string): { policyId: string; assetName: string } {
  if (unit === 'lovelace') {
    return { policyId: '', assetName: 'lovelace' };
  }
  
  // Policy ID is always 56 characters (28 bytes hex)
  const policyId = unit.slice(0, 56);
  const assetName = unit.slice(56);
  
  return { policyId, assetName };
}

/**
 * Decode asset name from hex to UTF-8 string
 */
export function decodeAssetName(hexName: string): string {
  try {
    const bytes = hexName.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [];
    return String.fromCharCode(...bytes);
  } catch {
    return hexName; // Return hex if decoding fails
  }
}