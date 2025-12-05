// ========================================
// NFT OFF-CHAIN FUNCTIONS
// frontend/src/lib/nft.ts
// ========================================

import { 
  type LucidEvolution, 
  Data, 
  type UTxO, 
  type Address, 
  type PolicyId, 
  type MintingPolicy, 
  type Unit,
  Constr,
  mintingPolicyToId,
  getAddressDetails, 
} from '@lucid-evolution/lucid';
import { getNFTPolicy, getNFTPolicyId } from './contracts';

// ========================================
// MINT CLASSROOM NFT
// ========================================

export interface MintNFTParams {
  lucid: LucidEvolution;
  teacherAddress: Address;
  classroomId: string;
  oneTimeUtxo: UTxO;
}

/**
 * Mint unique classroom NFT
 */
export async function mintClassroomNFT(params: MintNFTParams): Promise<{
  txHash: string;
  policyId: PolicyId;
  assetName: string;
  unit: Unit;
}> {
  const { lucid, teacherAddress, classroomId, oneTimeUtxo } = params;

  try {
    // Generate NFT asset name
    const assetName = 'CLASSROOM_' + classroomId;
    const assetNameHex = Buffer.from(assetName).toString('hex');

    // Get policy script (await it)
    const policyScript = await getNFTPolicy();
    
    const mintingPolicy: MintingPolicy = {
      type: 'PlutusV2',
      script: policyScript,
    };

    const policyId = mintingPolicyToId(mintingPolicy);
    const unit: Unit = policyId + assetNameHex;

    // Get teacher credential
    const teacherCredential = getAddressDetails(teacherAddress)
      .paymentCredential!.hash;

    // Create mint redeemer using Constr directly
    // Constructor 0 = Mint variant
    const redeemer = Data.to(
      new Constr(0, [
        new Constr(0, [
          teacherCredential,
          Buffer.from(classroomId, 'utf-8').toString('hex'),
          new Constr(0, [
            new Constr(0, [oneTimeUtxo.txHash]),
            BigInt(oneTimeUtxo.outputIndex)
          ])
        ])
      ])
    );

    console.log('🎨 Minting classroom NFT...');
    console.log(`   Name: ${assetName}`);
    console.log(`   Policy: ${policyId.slice(0, 20)}...`);

    // Build transaction - Lucid Evolution API
    const tx = await lucid
      .newTx()
      .collectFrom([oneTimeUtxo])
      .attach.MintingPolicy(mintingPolicy) // FIXED: attach.MintingPolicy
      .mintAssets({ [unit]: BigInt(1) }, redeemer)
      .pay.ToAddress(teacherAddress, { [unit]: BigInt(1) }) // FIXED: pay.ToAddress
      .addSigner(teacherAddress)
      .complete();

    // Sign and submit
    const signedTx = await tx.sign.withWallet().complete(); // FIXED: sign.withWallet()
    const txHash = await signedTx.submit();

    console.log('✅ NFT minted!');
    console.log(`   TxHash: ${txHash}`);
    console.log(`   Unit: ${unit}`);

    return { txHash, policyId, assetName, unit };
  } catch (error: any) {
    console.error('❌ Failed to mint NFT:', error);
    throw new Error(error.message || 'Failed to mint NFT');
  }
}

// ========================================
// BURN CLASSROOM NFT
// ========================================

export interface BurnNFTParams {
  lucid: LucidEvolution;
  ownerAddress: Address;
  nftUtxo: UTxO;
  policyId: PolicyId;
  assetName: string;
}

/**
 * Burn classroom NFT (owner only)
 */
export async function burnClassroomNFT(params: BurnNFTParams): Promise<string> {
  const { lucid, ownerAddress, nftUtxo, policyId, assetName } = params;

  try {
    // Create unit
    const assetNameHex = Buffer.from(assetName).toString('hex');
    const unit: Unit = policyId + assetNameHex;

    // Create burn redeemer (Constructor 1 for Burn variant)
    const redeemer = Data.to(new Constr(1, []));

    // Get policy script (await it)
    const policyScript = await getNFTPolicy();
    
    // Create minting policy
    const mintingPolicy: MintingPolicy = {
      type: 'PlutusV2',
      script: policyScript,
    };

    console.log('🔥 Burning classroom NFT...');
    console.log(`   Name: ${assetName}`);

    // Build transaction - Lucid Evolution API
    const tx = await lucid
      .newTx()
      .collectFrom([nftUtxo])
      .attach.MintingPolicy(mintingPolicy) // FIXED: attach.MintingPolicy
      .mintAssets({ [unit]: BigInt(-1) }, redeemer) // Negative = burn
      .complete();

    // Sign and submit
    const signedTx = await tx.sign.withWallet().complete(); // FIXED: sign.withWallet()
    const txHash = await signedTx.submit();

    console.log('✅ NFT burned!');
    console.log(`   TxHash: ${txHash}`);

    return txHash;
  } catch (error: any) {
    console.error('❌ Failed to burn NFT:', error);
    throw new Error(error.message || 'Failed to burn NFT');
  }
}

// ========================================
// QUERY FUNCTIONS
// ========================================

/**
 * Get all NFTs owned by address for specific policy
 */
export async function getOwnedNFTs(
  lucid: LucidEvolution,
  ownerAddress: Address,
  policyId: PolicyId
): Promise<Array<{ unit: Unit; assetName: string; utxo: UTxO }>> {
  try {
    const utxos = await lucid.utxosAt(ownerAddress);
    const nfts: Array<{ unit: Unit; assetName: string; utxo: UTxO }> = [];

    for (const utxo of utxos) {
      for (const [unit, amount] of Object.entries(utxo.assets)) {
        if (unit.startsWith(policyId) && amount > BigInt(0)) {
          const assetNameHex = unit.slice(policyId.length);
          const assetName = Buffer.from(assetNameHex, 'hex').toString();

          nfts.push({ unit, assetName, utxo });
        }
      }
    }

    return nfts;
  } catch (error) {
    console.error('❌ Failed to get owned NFTs:', error);
    return [];
  }
}

/**
 * Check if address owns specific NFT
 */
export async function hasNFT(
  lucid: LucidEvolution,
  ownerAddress: Address,
  policyId: PolicyId,
  assetName: string
): Promise<boolean> {
  try {
    const assetNameHex = Buffer.from(assetName).toString('hex');
    const unit: Unit = policyId + assetNameHex;

    const utxos = await lucid.utxosAt(ownerAddress);
    return utxos.some((utxo) => utxo.assets[unit] >= BigInt(1));
  } catch (error) {
    console.error('❌ Failed to check NFT:', error);
    return false;
  }
}

/**
 * Find UTXO containing specific NFT
 */
export async function findNFTUtxo(
  lucid: LucidEvolution,
  ownerAddress: Address,
  policyId: PolicyId,
  assetName: string
): Promise<UTxO | null> {
  try {
    const assetNameHex = Buffer.from(assetName).toString('hex');
    const unit: Unit = policyId + assetNameHex;

    const utxos = await lucid.utxosAt(ownerAddress);
    return utxos.find((utxo) => utxo.assets[unit] >= BigInt(1)) || null;
  } catch (error) {
    console.error('❌ Failed to find NFT UTXO:', error);
    return null;
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Select a unique UTXO from wallet for minting
 */
export async function selectUniqueUtxo(lucid: LucidEvolution): Promise<UTxO> {
  const utxos = await lucid.wallet().getUtxos();

  if (utxos.length === 0) {
    throw new Error('No UTXOs available in wallet');
  }

  // Prefer pure ADA UTXO
  const pureAdaUtxo = utxos.find(
    (utxo) =>
      Object.keys(utxo.assets).length === 1 && utxo.assets.lovelace >= BigInt(2_000_000)
  );

  if (pureAdaUtxo) return pureAdaUtxo;

  // Fallback: any UTXO with sufficient ADA
  const anyUtxo = utxos.find((utxo) => utxo.assets.lovelace >= BigInt(2_000_000));

  if (!anyUtxo) {
    throw new Error('No suitable UTXO found (need at least 2 ADA)');
  }

  return anyUtxo;
}

/**
 * Generate unique classroom ID
 */
export function generateClassroomId(
  subject: string,
  courseNumber: string,
  teacherId: string
): string {
  const timestamp = Date.now();
  return `${subject}_${courseNumber}_${teacherId.slice(0, 8)}_${timestamp}`;
}

/**
 * Validate classroom ID format
 */
export function isValidClassroomId(classroomId: string): boolean {
  // Alphanumeric and underscores only, max 32 chars
  return /^[A-Za-z0-9_]{1,32}$/.test(classroomId);
}