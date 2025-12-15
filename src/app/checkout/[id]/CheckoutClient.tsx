'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLucid } from '../../context/LucidContext';
import { normalizePkh } from '../../lib/escrow-utils';

/**
 * CheckoutClient
 *
 * This component handles the student payment flow for a course.
 * After building and submitting a transaction to the escrow script, it records
 * the deposit off‑chain via /api/escrow/create and then enrolls the user.
 * Syncing release flags (30%, 40%, final) is handled elsewhere (creator dashboard).
 */
export function CheckoutClient({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { lucid, walletAddress, balance, connectWallet, error } = useLucid();

  interface CourseResponse {
    id: string;
    userId: string;
    title: string;
    priceAda: number | null;
    isPaid: boolean;
    coverImage?: string | null;
    enrolled?: boolean;
  }

  const [course, setCourse] = useState<CourseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load course details on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}`);
        if (!res.ok) throw new Error('Failed to load course');
        const data = await res.json();
        setCourse({
          id: data.id,
          userId: data.userId,
          title: data.title,
          priceAda: data.priceAda ?? null,
          isPaid: data.isPaid,
          coverImage: data.coverImage,
          enrolled: !!data.enrolled,
        });
      } catch (e: any) {
        setLastError(e?.message || 'Failed to load course');
      } finally {
        setLoading(false);
      }
    };
    if (courseId) load();
  }, [courseId]);

  // Load current user ID
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) return;
        const data = await res.json();
        setCurrentUserId(data?.id || null);
      } catch {
        // ignore
      }
    })();
  }, []);

  const isOwnerCourse = useMemo(
    () => !!(currentUserId && course?.userId === currentUserId),
    [currentUserId, course]
  );
  const grossAda = useMemo(() => Number(course?.priceAda ?? 0), [course]);
  const grossLovelace = useMemo(() => BigInt(Math.floor(grossAda * 1_000_000)), [grossAda]);
  // 93% goes to instructor + escrow (7% fee)
  const netLovelace = useMemo(
    () => (grossLovelace <= 0n ? 0n : (grossLovelace * 93n) / 100n),
    [grossLovelace]
  );
  const feeLovelace = useMemo(() => grossLovelace - netLovelace, [grossLovelace, netLovelace]);

  const handlePay = async () => {
    // Preflight checks
    if (!lucid) {
      setStatusMsg('Wallet is still initializing. Please wait a moment, then click Pay & Lock again.');
      return;
    }
    if (!walletAddress) {
      setLastError('Connect your wallet with the button below, then click Pay & Lock again.');
      return;
    }
    if (!course || !course.isPaid || !course.priceAda || course.priceAda <= 0) {
      setLastError('Course is free or unavailable');
      return;
    }
    if (isOwnerCourse) {
      setLastError('You cannot enroll in your own course.');
      return;
    }

    setSubmitting(true);
    setLastError(null);
    setTxHash(null);
    setStatusMsg('Starting checkout...');

    try {
      console.info('[checkout] start pay & lock', { courseId });
      // 1. Fetch instructor wallet
      let receiverWallet: string | null = null;
      if (course?.userId) {
        try {
          const userRes = await fetch(`/api/users/${course.userId}`);
          if (userRes.ok) {
            const user = await userRes.json();
            receiverWallet = user.walletAddress ?? null;
          }
        } catch {
          receiverWallet = null;
        }
      }
      if (!receiverWallet) {
        throw new Error('Instructor wallet address not set. The course owner must set their payout address before payments can be made.');
      }

      // 2. Load Lucid modules dynamically (client‑side only)
      const [lucidModule, contractsModule] = await Promise.all([
        import('@lucid-evolution/lucid'),
        import('../../lib/contracts'),
      ]);
      const { Data } = lucidModule;
      const { EscrowDatumSchema, getEscrowAddress, resolveNetwork } = contractsModule;

      // 3. Compute script address and PKHs
      const scriptAddress = await getEscrowAddress(lucid, resolveNetwork());
      const receiver = normalizePkh(receiverWallet, 'Instructor wallet');
      const oraclePkhEnv = process.env.NEXT_PUBLIC_ORACLE_PKH;
      if (!oraclePkhEnv) throw new Error('Oracle PKH not configured');
      const oracle = normalizePkh(oraclePkhEnv, 'Oracle key hash');

      // 4. Build escrow datum for on‑chain storage
      const datum = {
        receiver,
        oracle,
        netTotal: netLovelace,
        paidCount: 1n,
        paidOut: 0n,
        released30: false,
        released40: false,
        releasedFinal: false,
        comments: 0n,
        ratingSum: 0n,
        ratingCount: 0n,
        allWatchMet: false,
        firstWatch: BigInt(Math.floor(Date.now() / 1000)),
        disputeBy: BigInt(Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60),
      } as const;

      // 5. Build and submit transaction to the script
      const tx = await lucid
        .newTx()
        .pay.ToContract(scriptAddress, { kind: 'inline', value: Data.to(datum as any, EscrowDatumSchema) }, { lovelace: netLovelace })
        .complete();
      const signed = await tx.sign.withWallet().complete();
      const hash = await signed.submit();
      setTxHash(hash);
      console.log('Transaction submitted:', hash);

      // 6. Wait for confirmation (optional on testnet)
      await lucid.awaitTx(hash);

      // 7. Record the payment off‑chain via /api/escrow/create
      await fetch('/api/escrow/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          netAmount: datum.netTotal.toString(),
        }),
      });

      // 8. Enroll the student (idempotent)
      await fetch(`/api/courses/${courseId}/enroll`, { method: 'POST' });

      // 9. Redirect to the course page
      router.push(`/course/${courseId}?paid=1&tx=${hash}`);
    } catch (e: any) {
      console.error('Payment failed:', e);
      setLastError(e?.message || 'Payment failed');
      setStatusMsg(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        Loading checkout...
      </main>
    );
  }
  if (!course) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        Course not found
      </main>
    );
  }
  const isFree = !course.isPaid || !course.priceAda || course.priceAda <= 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-2xl mx-auto space-y-6 relative">
        <h1 className="text-3xl font-bold">{course.title}</h1>
        {isFree ? (
          <p>This course is free</p>
        ) : (
          <div className="bg-white rounded-xl p-6 shadow space-y-4">
            <div>
              <p className="text-4xl font-bold">{course.priceAda} ADA</p>
              <p className="text-sm text-slate-500 mt-1">{walletAddress ? `${walletAddress.slice(0, 10)}...` : 'Not connected'}</p>
              {typeof balance === 'number' && <p className="text-sm">Balance: {balance.toFixed(4)} ADA</p>}
              {error && <p className="text-xs text-red-600 mt-1">Wallet init error: {error}</p>}
              {statusMsg && <p className="text-xs text-slate-600 mt-1">{statusMsg}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-slate-50 rounded p-3">
                <p className="text-slate-500">Fee (7%)</p>
                <p className="font-semibold">{(Number(feeLovelace) / 1_000_000).toFixed(4)}</p>
              </div>
              <div className="bg-slate-50 rounded p-3">
                <p className="text-slate-500">To Escrow</p>
                <p className="font-semibold">{(Number(netLovelace) / 1_000_000).toFixed(4)}</p>
              </div>
              <div className="bg-slate-50 rounded p-3">
                <p className="text-slate-500">Total</p>
                <p className="font-semibold">{grossAda.toFixed(4)}</p>
              </div>
            </div>
            {course.enrolled && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                You are already enrolled in this course.
              </div>
            )}
            <div className="flex gap-3 items-center flex-wrap">
              {!walletAddress && (
                <button onClick={() => connectWallet()} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
                  Connect Wallet
                </button>
              )}
              <button
                onClick={handlePay}
                disabled={submitting || course.enrolled || isOwnerCourse}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-60"
              >
                {isOwnerCourse
                  ? 'Owner cannot enroll'
                  : course.enrolled
                  ? 'Already Enrolled'
                  : submitting
                  ? 'Processing...'
                  : 'Pay & Lock'}
              </button>
              {(!lucid || !!error) && (
                <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg border text-sm">
                  Retry wallet init
                </button>
              )}
            </div>
            {txHash && <p className="text-xs text-emerald-700 break-all">Success! Tx: {txHash}</p>}
            {statusMsg && <p className="text-xs text-slate-600">{statusMsg}</p>}
            {(lastError || error) && <p className="text-xs text-red-600">{lastError || error}</p>}
          </div>
        )}
      </div>
      {submitting && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 rounded-xl">
          <div
            className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"
            aria-label="Locking funds"
          />
          <p className="text-sm text-slate-700">Please wait, locking funds…</p>
        </div>
      )}
    </main>
  );
}
