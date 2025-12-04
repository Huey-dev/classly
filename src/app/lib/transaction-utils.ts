// ========================================
// TRANSACTION UTILITIES
// src/app/lib/transaction-utils.ts
// ========================================

/**
 * Get Cardano explorer URL for a transaction
 */
export function getExplorerTxUrl(txHash: string, network: 'mainnet' | 'preview' | 'preprod' = 'preview'): string {
  const explorers = {
    mainnet: `https://cardanoscan.io/transaction/${txHash}`,
    preview: `https://preview.cardanoscan.io/transaction/${txHash}`,
    preprod: `https://preview.cardanoscan.io/transaction/${txHash}`
  };
  
  return explorers[network];
}

/**
 * Get Cardano explorer URL for an address
 */
export function getExplorerAddressUrl(address: string, network: 'mainnet' | 'preview' | 'preprod' = 'preview'): string {
  const explorers = {
    mainnet: `https://cardanoscan.io/address/${address}`,
    preview: `https://preview.cardanoscan.io/address/${address}`,
    preprod: `https://preprod.cardanoscan.io/address/${address}`
  };
  
  return explorers[network];
}

/**
 * Format lovelace to ADA
 */
export function lovelaceToAda(lovelace: bigint | number): number {
  return Number(lovelace) / 1_000_000;
}

/**
 * Format ADA to lovelace
 */
export function adaToLovelace(ada: number): bigint {
  return BigInt(Math.floor(ada * 1_000_000));
}

/**
 * Format a transaction hash for display
 */
export function formatTxHash(txHash: string, length: number = 20): string {
  if (txHash.length <= length) return txHash;
  return `${txHash.slice(0, length)}...`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Open transaction in new tab
 */
export function viewTxInExplorer(txHash: string, network: 'mainnet' | 'preview' | 'preprod' = 'preview'): void {
  window.open(getExplorerTxUrl(txHash, network), '_blank', 'noopener,noreferrer');
}

/**
 * Open address in new tab
 */
export function viewAddressInExplorer(address: string, network: 'mainnet' | 'preview' | 'preprod' = 'preview'): void {
  window.open(getExplorerAddressUrl(address, network), '_blank', 'noopener,noreferrer');
}

/**
 * Estimate transaction fee (rough estimate)
 */
export function estimateTxFee(outputs: number = 1): number {
  // Base fee + per-output fee (rough estimate in ADA)
  const baseFee = 0.17; // ~170,000 lovelace
  const perOutputFee = 0.03; // ~30,000 lovelace per output
  return baseFee + (perOutputFee * outputs);
}

/**
 * Validate Cardano address
 */
export function isValidCardanoAddress(address: string): boolean {
  // Basic validation - check if it starts with addr or addr_test
  return /^(addr|addr_test)1[a-z0-9]{50,}$/.test(address);
}

/**
 * Get network from address
 */
export function getNetworkFromAddress(address: string): 'mainnet' | 'testnet' | 'unknown' {
  if (address.startsWith('addr1')) return 'mainnet';
  if (address.startsWith('addr_test1')) return 'testnet';
  return 'unknown';
}

/**
 * Format date for transaction display
 */
export function formatTransactionDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}