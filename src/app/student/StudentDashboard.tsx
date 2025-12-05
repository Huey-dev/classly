// ========================================
// FILE 2: ACTUAL STUDENT DASHBOARD COMPONENT
// Location: src/app/student/StudentDashboard.tsx
// ========================================

'use client';

import { useState, useEffect } from 'react';
import { EscrowPayment } from './EscrowPayment';
import Link from 'next/link';
import type { LucidEvolution } from '@lucid-evolution/lucid';
import { EnrollmentList } from '../component/EnrollmentList/EnrollmentList';
import router from 'next/router';

// Utility to copy text to clipboard
function copyToClipboard(text: string) {
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

// Mock classroom data
const MOCK_CLASSROOMS = [
  {
    id: 'math_101',
    name: 'Advanced Mathematics 101',
    teacherAddress:'addr_test1qpt3f4vez5n62gasjjdp4pcvhycawz2wqkl7pmaw4cm92gfpl62xydflec2wn6sj5lzrq6fr5rfj0v8qj902klgewvhsk3vdrs',
    teacherName: 'Prof. Smith',
    price: 50,
    duration: '8 weeks',
    description: 'Learn advanced calculus and linear algebra',
    nftPolicyId: 'abc123...',
    nftAssetName: 'CLASSROOM_MATH101',
    rating: 4.8,
    students: 45,
  },
  {
    id: 'physics_201',
    name: 'Quantum Physics',
    teacherAddress: 'addr_test1qy...',
    teacherName: 'Dr. Johnson',
    price: 75,
    duration: '10 weeks',
    description: 'Introduction to quantum mechanics',
    nftPolicyId: 'def456...',
    nftAssetName: 'CLASSROOM_PHYS201',
    rating: 4.9,
    students: 32,
  },
  {
    id: 'cs_301',
    name: 'Smart Contract Development',
    teacherAddress: 'addr_test1qx...',
    teacherName: 'Prof. Anderson',
    price: 100,
    duration: '12 weeks',
    description: 'Build dApps on Cardano',
    nftPolicyId: 'ghi789...',
    nftAssetName: 'CLASSROOM_CS301',
    rating: 5.0,
    students: 28,
  },
];

export default function StudentDashboard() {
  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [showSeedModal, setShowSeedModal] = useState<boolean>(false);
  const [lucidInstance, setLucidInstance] = useState<LucidEvolution | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<any>(null);

  const BF_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;
  const STORAGE_KEY = 'classly_dev_wallet_seed';

  const displayMessage = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCopySeed = () => {
    copyToClipboard(seedPhrase);
    displayMessage('Seed phrase copied! Save it somewhere safe!', 'warning');
  };

  const handleCopyAddress = () => {
    copyToClipboard(address);
    displayMessage('Address copied to clipboard!', 'success');
  };

  const confirmReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setShowResetModal(false);
    window.location.reload();
  };

  const requestTestADA = () => {
    window.open(
      `https://docs.cardano.org/cardano-testnets/tools/faucet/?address=${address}`,
      '_blank'
    );
  };

  useEffect(() => {
    (async () => {
      try {
        console.log('=== Wallet Initialization Debug ===');
        console.log('BF_KEY exists:', !!BF_KEY);
        console.log('BF_KEY length:', BF_KEY?.length);
        console.log('BF_KEY starts with:', BF_KEY?.slice(0, 10));
        
        // Check if API key exists
        if (!BF_KEY || BF_KEY.length === 0) {
          throw new Error('Blockfrost API key is not configured. Please add NEXT_PUBLIC_BLOCKFROST_API_KEY to your .env.local file');
        }

        console.log('Loading Lucid Evolution...');
        const { Lucid, Blockfrost, generateSeedPhrase } = await import('@lucid-evolution/lucid');

        let seed = localStorage.getItem(STORAGE_KEY);
        if (!seed) {
          console.log('Generating new seed phrase...');
          seed = generateSeedPhrase();
          localStorage.setItem(STORAGE_KEY, seed);
          displayMessage('New wallet created! Please save your seed phrase.', 'warning');
        }

        setSeedPhrase(seed);

        console.log('Initializing Lucid with Blockfrost...');
        // Initialize Lucid with Blockfrost (Preview network)
        const lucid = await Lucid(
          new Blockfrost('https://cardano-preview.blockfrost.io/api/v0', BF_KEY),
          'Preview'
          
        );
        
        console.log('Selecting wallet from seed...');
        // Select wallet from seed
        lucid.selectWallet.fromSeed(seed);
        
        setLucidInstance(lucid);

        console.log('Getting wallet address...');
        // Get wallet address
        const addr = await lucid.wallet().address();
        console.log('Address:', addr);
        setAddress(addr);

        console.log('Fetching UTXOs...');
        // Fetch balance with better error handling
        try {
          const utxos = await lucid.wallet().getUtxos();
          console.log('UTXOs received:', utxos?.length || 0);
          
          if (!utxos || utxos.length === 0) {
            console.log('No UTXOs found - wallet is empty');
            setBalance(0);
          } else {
            console.log('Processing UTXOs for balance...');
            // Calculate total balance with extensive safety checks
            let total = BigInt(0);
            
            for (let i = 0; i < utxos.length; i++) {
              const utxo = utxos[i];
              console.log(`UTXO ${i}:`, JSON.stringify(utxo, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
              ));
              
              if (!utxo) {
                console.warn(`UTXO ${i} is null/undefined, skipping`);
                continue;
              }
              
              if (!utxo.assets) {
                console.warn(`UTXO ${i} has no assets property, skipping`);
                continue;
              }
              
              const lovelaceValue = utxo.assets.lovelace;
              
              if (lovelaceValue === undefined || lovelaceValue === null) {
                console.warn(`UTXO ${i} has no lovelace value, skipping`);
                continue;
              }
              
              try {
                // Handle both string and bigint types
                let lovelaceBigInt: bigint;
                
                if (typeof lovelaceValue === 'string') {
                  lovelaceBigInt = BigInt(lovelaceValue);
                } else if (typeof lovelaceValue === 'bigint') {
                  lovelaceBigInt = lovelaceValue;
                } else if (typeof lovelaceValue === 'number') {
                  lovelaceBigInt = BigInt(lovelaceValue);
                } else {
                  console.warn(`UTXO ${i} lovelace has unexpected type:`, typeof lovelaceValue);
                  continue;
                }
                
                console.log(`UTXO ${i} lovelace value: ${lovelaceBigInt.toString()}`);
                total += lovelaceBigInt;
              } catch (conversionError) {
                console.error(`Error converting UTXO ${i} lovelace to BigInt:`, conversionError, 'Value:', lovelaceValue);
                continue;
              }
            }
            
            console.log('Total lovelace:', total.toString());
            const adaBalance = Number(total) / 1_000_000;
            console.log('ADA balance:', adaBalance);
            setBalance(adaBalance);
          }
        } catch (balanceError) {
          console.error('Error fetching balance:', balanceError);
          console.error('Balance error stack:', (balanceError as Error).stack);
          setBalance(0);
        }

        console.log('Wallet initialization complete!');
        setLoading(false);
      } catch (err: any) {
        console.error('=== Initialization Error ===');
        console.error('Error:', err);
        console.error('Error message:', err?.message);
        console.error('Error stack:', err?.stack);
        setError(err?.message || String(err));
        setLoading(false);
      }
    })();
  }, [BF_KEY]);

  const handlePaymentComplete = (txHash: string) => {
    displayMessage(`Payment successful! Tx: ${txHash.slice(0, 10)}...`, 'success');
    setSelectedClassroom(null);
    // Reload balance
    setTimeout(async () => {
      if (lucidInstance) {
        try {
          const utxos = await lucidInstance.wallet().getUtxos();
          let total = BigInt(0);
          for (const utxo of utxos) {
            if (utxo.assets && utxo.assets.lovelace) {
              const lovelaceValue = utxo.assets.lovelace;
              const lovelaceBigInt = typeof lovelaceValue === 'string' 
                ? BigInt(lovelaceValue) 
                : BigInt(lovelaceValue);
              total += lovelaceBigInt;
            }
          }
          setBalance(Number(total) / 1_000_000);
        } catch (e) {
          console.error('Error reloading balance:', e);
        }
      }
    }, 2000);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Connecting Wallet</h2>
          <p className="text-gray-600 dark:text-gray-300">Loading Cardano Preview Testnet...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-red-600 to-orange-600 dark:bg-gray-900 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Wallet Connection Error</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Could not initialize Cardano wallet. Please check your configuration.
            </p>
            <pre className="bg-red-50 p-4 rounded-lg text-red-700 text-sm overflow-auto whitespace-pre-wrap">{error}</pre>
            
            <div className="mt-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <h3 className="font-bold text-yellow-800 mb-2">Troubleshooting:</h3>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>Make sure you have a Blockfrost API key</li>
                <li>Add it to <code className="bg-yellow-100 px-1 rounded">.env.local</code> as <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_BLOCKFROST_API_KEY</code></li>
                <li>Get a free key at <a href="https://blockfrost.io" target="_blank" className="underline">blockfrost.io</a></li>
                <li>Make sure to select "Preview" network</li>
                <li>Restart your dev server after adding the key</li>
              </ul>
            </div>

            <div className="mt-4">
              <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Message Alert */}
        {message && (
          <div
            className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg font-bold ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 border-2 border-green-300'
                : message.type === 'warning'
                ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                : 'bg-red-100 text-red-800 border-2 border-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-blue-600 mb-2"> Student Dashboard</h1>
              <div className="flex items-center space-x-2">
                <p className="text-gray-600 dark:text-gray-300 text-sm font-mono">
                  {address?.slice(0, 20)}...{address?.slice(-10)}
                </p>
                <button
                  onClick={handleCopyAddress}
                  className="text-blue-600 hover:text-blue-700 font-bold text-sm"
                >
                  📋
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center space-y-3 md:space-y-0 md:space-x-4">
              {/* Balance */}
              <div className="bg-blue-50 rounded-lg px-6 py-3 border-2 border-blue-200">
                <p className="text-sm text-blue-600 mb-1">Your Balance</p>
                <p className="text-2xl font-bold text-blue-800">{balance.toFixed(2)} tADA</p>
              </div>

              {/* Wallet Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowSeedModal(true)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition whitespace-nowrap"
                >
                  View Seed Phrase
                </button>
                {balance < 10 && (
                  <button
                    onClick={requestTestADA}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition whitespace-nowrap"
                  >
                    Faucet
                  </button>
                )}
                {/* <Link href="/" className="text-gray-600 hover:text-gray-800 font-semibold py-2 px-4">
                  ← Home
                </Link> */}
              </div>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50  border-2 border-yellow-300 rounded-xl p-4 mb-8">
          <p className="text-yellow-800">
            <strong>⚠️ Testnet Wallet:</strong> This is a Preview testnet wallet. Your seed phrase is
            stored in browser localStorage. Make sure to back it up!
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          {/* Classroom List */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Available Courses</h2>

              <div className="space-y-4">
                {MOCK_CLASSROOMS.map((classroom) => (
                  <div
                    key={classroom.id}
                    className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-1">{classroom.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">by {classroom.teacherName}</p>
                        <p className="text-gray-700 text-sm mb-3">{classroom.description}</p>
                      </div>

                      <div className="text-right ml-4">
                        <p className="text-2xl font-bold text-purple-600">{classroom.price} tADA</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <span className="mr-1">📅</span>
                        {classroom.duration}
                      </div>
                      <div className="flex items-center">
                        <span className="mr-1">⭐</span>
                        {classroom.rating} rating
                      </div>
                      <div className="flex items-center">
                        <span className="mr-1">👥</span>
                        {classroom.students} students
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedClassroom(classroom)}
                      disabled={balance < classroom.price}
                      className={`w-full font-bold py-3 px-6 rounded-lg transition ${
                        balance < classroom.price
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {balance < classroom.price ? 'Insufficient Balance' : 'Enroll Now →'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment/Wallet Section */}
          <div>
            {selectedClassroom ? (
              <EscrowPayment 
                classroom={selectedClassroom} 
                lucid={lucidInstance}
                studentAddress={address}
                currentBalance={balance}
                onPaymentComplete={handlePaymentComplete} 
                onCancel={() => setSelectedClassroom(null)}
              />
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Select a Class</h3>
                <p className="text-gray-600 text-sm">
                  Choose a class from the list to enroll and make payment
                </p>
              </div>
            )}

            {/* Wallet Management */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Wallet Management</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowSeedModal(true)}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg transition"
                >
                  🔑 View Seed Phrase
                </button>
                <button
                  onClick={() => setShowResetModal(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition"
                >
                  🔄 Reset Wallet
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* My Enrollments Section */}
        <div className="mt-8">
          <EnrollmentList
            enrollments={[
              // This would come from your actual data
              {
                id: 'enroll_1',
                courseId: 'math_101',
                courseName: 'Advanced Mathematics 101',
                instructorName: 'Prof. Smith',
                enrolledAt: new Date('2023-10-15'),
                status: 'active',
                progress: 45,
                lastAccessed: new Date('2023-11-20')
              },
              // Add more enrollments as needed
            ]}
            emptyState={{
              title: 'No enrollments yet',
              description: 'You have not enrolled in any courses yet.',
              ctaText: 'Browse Courses',
              ctaHref: '/courses'
            }}
            onEnrollmentClick={(enrollment) => {
              // Handle click on an enrollment
              router.push(`/courses/${enrollment.courseId}`);
            }}
          />
        </div>

        {/* Seed Phrase Modal */}
        {showSeedModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-3">🔑 Your Seed Phrase</h3>
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                <p className="text-red-800 font-bold">⚠️ NEVER SHARE YOUR SEED PHRASE!</p>
                <p className="text-red-700 text-sm mt-1">
                  Anyone with this phrase can access your wallet and funds.
                </p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <p className="font-mono text-sm break-all text-gray-800">{seedPhrase}</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleCopySeed}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                  📋 Copy Seed
                </button>
                <button
                  onClick={() => setShowSeedModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Confirmation Modal */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-3">Confirm Wallet Reset</h3>
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                <p className="text-red-800 font-bold mb-2">⚠️ WARNING: This action is irreversible!</p>
                <p className="text-red-700 text-sm">
                  You will lose access to the current wallet and any funds in it unless you have saved
                  the seed phrase.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReset}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                  Yes, Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}