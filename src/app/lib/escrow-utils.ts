import { getAddressDetails } from "@lucid-evolution/lucid";
import { blake2b } from "@noble/hashes/blake2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { EscrowDatum } from "./contracts";

type Bigish = bigint | number | string | null | undefined;

function toBigInt(value: Bigish, fallback: bigint = 0n): bigint {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  const trimmed = `${value}`.trim();
  if (!trimmed) return fallback;
  return BigInt(trimmed);
}

export function formatAda(lovelace: Bigish, decimals = 4): string {
  const lovelaceBi = toBigInt(lovelace);
  const ada = Number(lovelaceBi) / 1_000_000;
  return ada.toFixed(decimals);
}

export function secondsUntil(targetUnixSecondsOrMs: Bigish): number {
  const raw = toBigInt(targetUnixSecondsOrMs);
  if (raw <= 0n) return 0;
  // Heuristic: seconds are ~10 digits; ms are ~13 digits.
  const targetMs = raw < 10_000_000_000n ? raw * 1000n : raw;
  const nowMs = BigInt(Date.now());
  if (targetMs <= nowMs) return 0;
  return Number((targetMs - nowMs) / 1000n);
}

/**
 * Normalize a Bech32 address or raw key hash (hex) into a payment key hash.
 * The validator expects ByteArray; this guarantees we feed hashes, not addresses.
 */
export function normalizePkh(input: string, label = "address or key hash"): string {
  const trimmed = (input || "").trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }

  const hexPkh = /^[0-9a-fA-F]{54,64}$/; // allow 27-32 byte hex just in case
  if (hexPkh.test(trimmed) && trimmed.length % 2 === 0) {
    return trimmed.toLowerCase();
  }

  const details = getAddressDetails(trimmed);
  const hash = details.paymentCredential?.hash;
  if (!hash) {
    throw new Error(`Unable to derive payment key hash for ${label}`);
  }
  return hash;
}

export function enrollmentProgress(paidCount: Bigish, threshold = 5n) {
  const count = toBigInt(paidCount);
  const remaining = threshold > count ? Number(threshold - count) : 0;
  const percent = Math.min(100, Math.round((Number(count) / Number(threshold)) * 100));
  return { count, remaining, percent };
}

export function disputeCountdown(disputeBy: Bigish) {
  const seconds = secondsUntil(disputeBy);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return { seconds, days, hours, minutes };
}

export function computeAddPaymentTransition(
  current: EscrowDatum,
  netAmount: bigint,
  opts: {
    watchMet: boolean;
    ratingX10: number;
    commented: boolean;
    firstWatchAt: bigint;
  }
) {
  const newCount = current.paidCount + 1n;
  const alreadyReleased30 = current.released30 || current.paidCount >= 5n;

  let newNetTotal = current.netTotal + netAmount;
  let immediatePayout = 0n;
  let released30 = current.released30;

  if (!alreadyReleased30 && newCount >= 5n) {
    immediatePayout = (newNetTotal * 30n) / 100n;
    newNetTotal -= immediatePayout;
    released30 = true;
  } else if (alreadyReleased30 || newCount > 5n) {
    immediatePayout = (netAmount * 30n) / 100n;
    newNetTotal -= immediatePayout;
    released30 = true;
  }

  const newDatum: EscrowDatum = {
    ...current,
    netTotal: newNetTotal,
    paidOut: (current.paidOut ?? 0n) + immediatePayout,
    paidCount: newCount,
    comments: current.comments + (opts.commented ? 1n : 0n),
    ratingSum: current.ratingSum + BigInt(opts.ratingX10),
    ratingCount: current.ratingCount + (opts.ratingX10 > 0 ? 1n : 0n),
    allWatchMet: current.allWatchMet && opts.watchMet,
    firstWatch: current.firstWatch === 0n ? opts.firstWatchAt : current.firstWatch,
    released30,
  };

  return { newDatum, immediatePayout };
}

/**
 * Compute the on-chain course_id ByteArray used in the datum.
 * Uses blake2b-256 over UTF-8 bytes of the courseId and returns a hex string.
 */
export function hashCourseId(courseId: string): string {
  const bytes = utf8ToBytes(courseId);
  const digest = blake2b(bytes, { dkLen: 32 });
  return bytesToHex(digest);
}

export function breakdownFromDatum(datum: Partial<EscrowDatum> | null) {
  if (!datum) {
    return {
      locked: 0n,
      paidOut: 0n,
      released30: false,
      released40: false,
      releasedFinal: false,
      total: 0n,
    };
  }

  const netTotal = toBigInt(datum.netTotal);
  const paidOut = toBigInt(datum.paidOut);
  const total = netTotal + paidOut;

  return {
    locked: netTotal,
    paidOut,
    released30: !!datum.released30,
    released40: !!datum.released40,
    releasedFinal: !!datum.releasedFinal,
    total,
  };
}

export function averageRating(ratingSum: Bigish, ratingCount: Bigish) {
  const count = toBigInt(ratingCount);
  if (count === 0n) return 0;
  const sum = toBigInt(ratingSum);
  return Number(sum) / Number(count) / 10; // stored as x10
}
