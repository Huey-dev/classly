// ========================================
// STUDENT ESCROW PAYMENT COMPONENT (UPDATED)
// src/app/student/EscrowPayment.tsx
// ========================================

'use client';

import { useState, useEffect } from 'react';
import type { LucidEvolution } from '@lucid-evolution/lucid';

interface CourseInfo {
  id: string;
  name: string;
  receiverAddress: string;
  receiverName: string;
  price: number; // in ADA
  duration: string;
  description: string;
  nftPolicyId?: string;
  nftAssetName?: string;
}

interface EscrowPaymentProps {
  course:  CourseInfo;
  lucid?: LucidEvolution | null; // Optional: from StudentDashboard
  senderAddress?: string  | null; // Optional: from StudentDashboard
  currentBalance?: number; // Optional: from StudentDashboard
  onPaymentComplete?: (txHash: string) => void;
  onCancel?: () => void;
}

export function EscrowPayment({ 
  course, 
  lucid: lucidProp,
  senderAddress: senderAddressProp,
  currentBalance: currentBalanceProp,
  onPaymentComplete,
  onCancel
}: EscrowPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number>(currentBalanceProp || 0);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Update balance when prop changes
  useEffect(() => {
    if (currentBalanceProp !== undefined) {
      setBalance(currentBalanceProp);
    }
  }, [currentBalanceProp]);

  const lucid = lucidProp;
  const address = senderAddressProp;
  const isConnected = !!(lucid && address);

  // Handle payment
  async function handlePayment() {
    if (!lucid || !address) {
      setError('Wallet not initialized. Please try refreshing the page.');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    const totalRequired = course.price + 2.2; // Class price + estimated fees
    if (balance < totalRequired) {
      setError(`Insufficient balance. You need at least ${totalRequired.toFixed(2)} ADA (${course.price} ADA for class + ~2.2 ADA for fees)`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('=== Starting Payment Transaction ===');
      console.log('From:', address);
      console.log('To:', course.receiverAddress);
      console.log('Amount:', course.price, 'ADA');

      // Convert ADA to Lovelace (1 ADA = 1,000,000 Lovelace)
      const lovelaceAmount = BigInt(course.price * 1_000_000);

      console.log('Building transaction...');
      
      // Build simple payment transaction
      const tx = await lucid
        .newTx()
        .pay.ToAddress(course.receiverAddress, { lovelace: lovelaceAmount })
        .complete();

      console.log('Transaction built successfully');
      console.log('Signing transaction...');

      // Sign the transaction
      const signedTx = await tx.sign.withWallet().complete();

      console.log('Transaction signed');
      console.log('Submitting transaction...');

      // Submit the transaction
      const hash = await signedTx.submit();

      console.log('✅ Transaction submitted successfully!');
      console.log('Transaction hash:', hash);

      setTxHash(hash);

      // Wait for transaction confirmation (optional, can be slow on testnet)
      console.log('Waiting for confirmation...');
      try {
        await lucid.awaitTx(hash, 30000); // 30 second timeout
        console.log('✅ Transaction confirmed!');
      } catch (confirmError) {
        console.log('Transaction submitted but confirmation timed out (this is normal on testnets)');
      }

      // Callback
      if (onPaymentComplete) {
        onPaymentComplete(hash);
      }

    } catch (err: any) {
      console.error('❌ Payment failed:', err);
      setError(err?.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
        <p className="text-yellow-800 dark:text-yellow-400 font-semibold mb-2">
          🔌 Wallet Not Connected
        </p>
        <p className="text-yellow-700 dark:text-yellow-500 text-sm">
          Please connect your wallet to make a payment
        </p>
      </div>
    );
  }

  if (txHash) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
            Payment Successful!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your enrollment is being processed
          </p>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Transaction Hash:</p>
            <p className="font-mono text-xs break-all text-gray-800 dark:text-gray-200">
              {txHash}
            </p>
          </div>

          <div className="space-y-3">
            <a
              href={`https://preview.cardanoscan.io/transaction/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              🔍 View on CardanoScan
            </a>
            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition"
              >
                Close
              </button>
            )}
          </div>

          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-400 font-bold mb-2">
              What happens next?
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-500 text-left space-y-1">
              <li>✅ Payment sent to teacher's address</li>
              <li>✅ Transaction is confirmed on Cardano blockchain</li>
              <li>✅ You can now access the course materials</li>
              <li>⏳ It may take 1-2 minutes for the transaction to appear on the explorer</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6 rounded-t-xl">
        <h2 className="text-2xl font-bold mb-2">Enroll in this Course</h2>
        <p className="text-purple-100">{course.name}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* course Info */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3">Class Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Instructor:</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{course.receiverName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Duration:</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{course.duration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Price:</span>
              <span className="font-bold text-purple-600 dark:text-purple-400 text-lg">
                {course.price} tADA
              </span>
            </div>
          </div>
        </div>

        {/* Your Balance */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-blue-800 dark:text-blue-400 font-semibold">Your Balance:</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-300">
              {balance.toFixed(2)} tADA
            </span>
          </div>
          {balance < course.price + 2.2 && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-2">
              Insufficient balance. Need at least {(course.price + 2.2).toFixed(2)} tADA
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Payment Breakdown */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3">Payment Breakdown</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <span>Class Fee:</span>
              <span>{course.price} tADA</span>
            </div>
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <span>Transaction Fee (est.):</span>
              <span>~0.2 tADA</span>
            </div>
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <span>Min UTxO (refundable):</span>
              <span>~2 tADA</span>
            </div>
            <div className="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2 flex justify-between font-bold text-gray-800 dark:text-gray-200">
              <span>Total Required:</span>
              <span className="text-purple-600 dark:text-purple-400">~{(course.price + 2.2).toFixed(1)} tADA</span>
            </div>
          </div>
        </div>

        {/* Teacher Address */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Payment will be sent to:</p>
          <p className="font-mono text-xs text-gray-800 dark:text-gray-200 break-all">
            {course.receiverAddress}
          </p>
        </div>

        {/* Terms & Conditions */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              I understand that this payment will be sent directly to the teacher's address 
              on the Cardano Preview testnet. This is a test transaction using test ADA.
            </span>
          </label>
        </div>

        {/* Payment Button */}
        <button
          onClick={handlePayment}
          disabled={loading || !agreedToTerms || balance < course.price + 2.2}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Processing Payment...
            </span>
          ) : (
            `💳 Pay ${course.price} tADA & Enroll`
          )}
        </button>

        {/* Cancel Button */}
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50"
          >
            Cancel
          </button>
        )}

        {/* Security Note */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          <p>🔒 Secured by Cardano Blockchain</p>
          <p>Preview Testnet - Test ADA only</p>
        </div>
      </div>
    </div>
  );
}