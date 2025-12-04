// ========================================
// REPUTATION OFF-CHAIN FUNCTIONS
// frontend/src/lib/reputation.ts
// ========================================

import { 
  type LucidEvolution, 
  Data, 
  type UTxO, 
  type Address, 
  Constr,
  getAddressDetails 
} from '@lucid-evolution/lucid';
import { getReputationValidator, getReputationAddress } from './contracts';

// ========================================
// TYPES - FIXED
// ========================================

const ReputationDatumSchema = Data.Object({
  teacher_address: Data.Bytes(),
  total_rating_sum: Data.Integer(),
  total_ratings_count: Data.Integer(),
  last_updated: Data.Integer(),
  version: Data.Integer(),
});

type ReputationDatum = Data.Static<typeof ReputationDatumSchema>;
const ReputationDatum = ReputationDatumSchema as unknown as ReputationDatum;

// ========================================
// INITIALIZE REPUTATION
// ========================================

export interface InitializeReputationParams {
  lucid: LucidEvolution;
  teacherAddress: Address;
}

/**
 * Initialize reputation system for teacher
 */
export async function initializeReputation(
  params: InitializeReputationParams
): Promise<string> {
  const { lucid, teacherAddress } = params;

  try {
    // Get teacher credential
    const teacherCredential = getAddressDetails(teacherAddress)
      .paymentCredential!.hash;

    // Create initial datum
    const datum: ReputationDatum = {
      teacher_address: teacherCredential,
      total_rating_sum: BigInt(0),
      total_ratings_count: BigInt(0),
      last_updated: BigInt(Date.now()),
      version: BigInt(0),
    };

    // Get script address
    const scriptAddress = await getReputationAddress(lucid);

    console.log('⭐ Initializing reputation...');
    console.log(`   Script: ${scriptAddress}`);

    // Build transaction
    const tx = await lucid
      .newTx()
      .pay.ToContract(
        scriptAddress,
        { kind: "inline", value: Data.to(datum, ReputationDatum) },
        { lovelace: BigInt(2_000_000) } // 2 ADA locked
      )
      .complete();

    // Sign and submit
    const signedTx = await tx.sign.withWallet().complete();
    const txHash = await signedTx.submit();

    console.log('✅ Reputation initialized!');
    console.log(`   TxHash: ${txHash}`);

    return txHash;
  } catch (error: any) {
    console.error('❌ Failed to initialize reputation:', error);
    throw new Error(error.message || 'Failed to initialize reputation');
  }
}

// ========================================
// ADD RATING
// ========================================

export interface AddRatingParams {
  lucid: LucidEvolution;
  studentAddress: Address;
  reputationUtxo: UTxO;
  rating: number; // 1-5
}

/**
 * Student adds rating for teacher
 */
export async function addRating(params: AddRatingParams): Promise<string> {
  const { lucid, studentAddress, reputationUtxo, rating } = params;

  try {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Parse current datum
    const currentDatum = Data.from(reputationUtxo.datum!, ReputationDatum);

    // Get student credential
    const studentCredential = getAddressDetails(studentAddress)
      .paymentCredential!.hash;

    // Create new datum
    const newDatum: ReputationDatum = {
      teacher_address: currentDatum.teacher_address,
      total_rating_sum: currentDatum.total_rating_sum + BigInt(rating),
      total_ratings_count: currentDatum.total_ratings_count + BigInt(1),
      last_updated: BigInt(Date.now()),
      version: currentDatum.version + BigInt(1),
    };

    // Create redeemer (Constructor 0 for AddRating variant)
    const redeemer = Data.to(
      new Constr(0, [
        new Constr(0, [
          BigInt(rating),
          studentCredential,
        ])
      ])
    );

    // Get validator script
    const validatorScript = await getReputationValidator();
    
    // Create validator
    const validator = {
      type: 'PlutusV2' as const,
      script: validatorScript,
    };

    // Get script address
    const scriptAddress = await getReputationAddress(lucid);

    console.log('⭐ Adding rating...');
    console.log(`   Rating: ${rating} stars`);
    console.log(`   New average: ${calculateAverage(newDatum).toFixed(2)}`);

    // Build transaction
    const tx = await lucid
      .newTx()
      .collectFrom([reputationUtxo], redeemer)
      .attach.SpendingValidator(validator)
      .pay.ToContract(
        scriptAddress,
        { kind: "inline", value: Data.to(newDatum, ReputationDatum) },
        { lovelace: BigInt(2_000_000) } // Preserve 2 ADA
      )
      .addSigner(studentAddress)
      .complete();

    // Sign and submit
    const signedTx = await tx.sign.withWallet().complete();
    const txHash = await signedTx.submit();

    console.log('✅ Rating added!');
    console.log(`   TxHash: ${txHash}`);

    return txHash;
  } catch (error: any) {
    console.error('❌ Failed to add rating:', error);
    throw new Error(error.message || 'Failed to add rating');
  }
}

// ========================================
// QUERY FUNCTIONS
// ========================================

/**
 * Get teacher's reputation UTXO
 */
export async function getTeacherReputation(
  lucid: LucidEvolution,
  teacherAddress: Address
): Promise<UTxO | null> {
  try {
    const scriptAddress = await getReputationAddress(lucid);
    const utxos = await lucid.utxosAt(scriptAddress);
    const teacherHash = getAddressDetails(teacherAddress)
      .paymentCredential!.hash;

    for (const utxo of utxos) {
      if (!utxo.datum) continue;

      try {
        const datum = Data.from(utxo.datum, ReputationDatum);
        if (datum.teacher_address === teacherHash) {
          return utxo;
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Failed to get reputation:', error);
    return null;
  }
}

/**
 * Get reputation details from UTXO
 */
export interface ReputationDetails {
  teacherAddress: string;
  totalRatings: number;
  ratingCount: number;
  averageRating: number;
  percentageScore: number;
  lastUpdated: Date;
  version: number;
}

export function getReputationDetails(utxo: UTxO): ReputationDetails | null {
  if (!utxo.datum) return null;

  try {
    const datum = Data.from(utxo.datum, ReputationDatum);
    const average = calculateAverage(datum);

    return {
      teacherAddress: datum.teacher_address,
      totalRatings: Number(datum.total_rating_sum),
      ratingCount: Number(datum.total_ratings_count),
      averageRating: average,
      percentageScore: (average / 5) * 100,
      lastUpdated: new Date(Number(datum.last_updated)),
      version: Number(datum.version),
    };
  } catch (e) {
    return null;
  }
}

/**
 * Get all teachers with reputation
 */
export async function getAllTeacherReputations(
  lucid: LucidEvolution
): Promise<ReputationDetails[]> {
  try {
    const scriptAddress = await getReputationAddress(lucid);
    const utxos = await lucid.utxosAt(scriptAddress);
    const reputations: ReputationDetails[] = [];

    for (const utxo of utxos) {
      const details = getReputationDetails(utxo);
      if (details) {
        reputations.push(details);
      }
    }

    // Sort by average rating (descending)
    return reputations.sort((a, b) => b.averageRating - a.averageRating);
  } catch (error) {
    console.error('❌ Failed to get all reputations:', error);
    return [];
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Calculate average rating from datum
 */
export function calculateAverage(datum: ReputationDatum): number {
  if (datum.total_ratings_count === BigInt(0)) return 0;
  return Number(datum.total_rating_sum) / Number(datum.total_ratings_count);
}

/**
 * Get star rating display (e.g., "⭐⭐⭐⭐⭐")
 */
export function getStarDisplay(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    '⭐'.repeat(fullStars) +
    (hasHalfStar ? '✨' : '') +
    '☆'.repeat(emptyStars)
  );
}

/**
 * Get rating badge color based on score
 */
export function getRatingBadgeColor(rating: number): string {
  if (rating >= 4.5) return 'green'; // Excellent
  if (rating >= 4.0) return 'blue'; // Very Good
  if (rating >= 3.5) return 'yellow'; // Good
  if (rating >= 3.0) return 'orange'; // Average
  return 'red'; // Below Average
}

/**
 * Format rating for display
 */
export function formatRating(datum: ReputationDatum): string {
  const avg = calculateAverage(datum);
  const count = Number(datum.total_ratings_count);
  return `${avg.toFixed(2)} ⭐ (${count} ${count === 1 ? 'rating' : 'ratings'})`;
}

/**
 * Check if teacher has minimum reputation
 */
export function hasMinimumReputation(
  datum: ReputationDatum,
  minRating: number,
  minCount: number
): boolean {
  const avg = calculateAverage(datum);
  const count = Number(datum.total_ratings_count);
  return avg >= minRating && count >= minCount;
}