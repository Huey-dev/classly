// src/app/lib/lucid.ts
import { Blockfrost, Lucid, type LucidEvolution } from '@lucid-evolution/lucid';

const BLOCKFROST_URL = `https://cardano-${process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() || 'preview'}.blockfrost.io/api/v0`;
const BLOCKFROST_API_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || '';
const NETWORK = (process.env.NEXT_PUBLIC_NETWORK as 'Preview' | 'Mainnet') || 'Preview';

export type WalletName = 'nami' | 'eternl' | 'flint' | 'lace';

export async function initLucid(): Promise<LucidEvolution> {
  try {
    if (!BLOCKFROST_API_KEY) {
      throw new Error('Blockfrost API key is not configured');
    }

    const lucid = await Lucid(
      new Blockfrost(BLOCKFROST_URL, BLOCKFROST_API_KEY),
      NETWORK
    );
    
    console.log('✅ Lucid initialized');
    console.log(`📡 Network: ${NETWORK}`);
    
    return lucid;
  } catch (error) {
    console.error('❌ Failed to initialize Lucid:', error);
    throw new Error('Failed to initialize Lucid. Check your Blockfrost API key.');
  }
}

export async function connectWallet(
  lucid: LucidEvolution,
  walletName: WalletName
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Wallet connection only available in browser');
  }

  try {
    const walletAPI = window.cardano?.[walletName];
    
    if (!walletAPI) {
      throw new Error(`${walletName} wallet not installed`);
    }

    const api = await walletAPI.enable();
    lucid.selectWallet.fromAPI(api);

    const address = await lucid.wallet().address();
    
    console.log('✅ Wallet connected');
    console.log(`👛 Address: ${address.slice(0, 20)}...`);
    
    return address;
  } catch (error: any) {
    console.error('❌ Failed to connect wallet:', error);
    
    if (error.code === 2) {
      throw new Error('Wallet connection was rejected by user');
    }
    
    throw new Error(error.message || 'Failed to connect wallet');
  }
}

export async function getWalletBalance(lucid: LucidEvolution): Promise<{
  lovelace: bigint;
  assets: Record<string, bigint>;
}> {
  try {
    const utxos = await lucid.wallet().getUtxos();
    
    let lovelace = BigInt(0);
    const assets: Record<string, bigint> = {};
    
    for (const utxo of utxos) {
      lovelace += utxo.assets.lovelace;
      
      for (const [unit, amount] of Object.entries(utxo.assets)) {
        if (unit === 'lovelace') continue;
        assets[unit] = (assets[unit] || BigInt(0)) + amount;
      }
    }
    
    return { lovelace, assets };
  } catch (error) {
    console.error('❌ Failed to get balance:', error);
    throw error;
  }
}

export function lovelaceToAda(lovelace: bigint): string {
  return (Number(lovelace) / 1_000_000).toFixed(6);
}

export function formatAssetAmount(amount: bigint, decimals: number = 0): string {
  if (decimals === 0) return amount.toString();
  return (Number(amount) / Math.pow(10, decimals)).toFixed(decimals);
}

export function isWalletInstalled(walletName: WalletName): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.cardano?.[walletName]);
}

export function getInstalledWallets(): WalletName[] {
  if (typeof window === 'undefined') return [];
  
  const wallets: WalletName[] = [];
  const availableWallets: WalletName[] = ['nami', 'eternl', 'flint', 'lace'];
  
  for (const wallet of availableWallets) {
    if (isWalletInstalled(wallet)) {
      wallets.push(wallet);
    }
  }
  
  return wallets;
}

export function getWalletInfo(walletName: WalletName): { name: string; icon?: string } | null {
  if (typeof window === 'undefined') return null;
  
  const walletAPI = window.cardano?.[walletName];
  
  if (!walletAPI) return null;
  
  return {
    name: walletName,
    icon: undefined,
  };
}

export function disconnectWallet(): void {
  console.log('🔌 Wallet disconnected');
}