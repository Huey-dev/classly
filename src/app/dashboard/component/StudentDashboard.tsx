'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EscrowPayment } from '../payment/EscrowPayment';
import { EnrollmentList } from '../../component/EnrollmentList/EnrollmentList';
import { useLucid } from '../../context/LucidContext';

// Utility to copy text to clipboard (avoids navigator permissions issues)
function copyToClipboard(text: string) {
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

export default function StudentDashboard() {
  const router = useRouter();
  const {
    lucid,
    walletAddress: address,
    balance,
    seedPhrase,
    disconnectWallet,
    refreshBalance,
    connecting,
    loading,
    error,
  } = useLucid();

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [showSeedModal, setShowSeedModal] = useState<boolean>(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadCourses = async () => {
      setCoursesLoading(true);
      setCoursesError(null);
      try {
        const res = await fetch('/api/courses/public');
        if (!res.ok) {
          throw new Error(`Failed to load courses: ${res.status}`);
        }
        const data = await res.json();
        if (!active) return;
        const monetized = (data || []).filter((c: any) => Number(c.priceAda ?? 0) > 0);
        setCourses(monetized);
      } catch (e: any) {
        if (!active) return;
        setCoursesError(e?.message || 'Unable to load courses');
      } finally {
        if (active) setCoursesLoading(false);
      }
    };
    loadCourses();
    return () => {
      active = false;
    };
  }, []);

  const displayMessage = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCopySeed = () => {
    if (!seedPhrase) return;
    copyToClipboard(seedPhrase);
    displayMessage('Seed phrase copied! Save it somewhere safe!', 'warning');
  };

  const handleCopyAddress = () => {
    if (!address) return;
    copyToClipboard(address);
    displayMessage('Address copied to clipboard!', 'success');
  };

  const confirmReset = () => {
    setShowResetModal(false);
    disconnectWallet();
  };

  const requestTestADA = () => {
    if (!address) return;
    window.open(`https://docs.cardano.org/cardano-testnets/tools/faucet/?address=${address}`, '_blank');
  };

  const handlePaymentComplete = (txHash: string) => {
    displayMessage(`Payment successful! Tx: ${txHash.slice(0, 10)}...`, 'success');
    setSelectedCourse(null);
    setTimeout(() => {
      refreshBalance().catch((e) => console.error('Error reloading balance:', e));
    }, 2000);
  };

  const safeBalance = balance ?? 0;
  const visibleCourses = courses.map((c) => ({
    id: c.id,
    name: c.title,
    teacherAddress: c.author?.walletAddress ?? '',
    teacherName: c.author?.name ?? 'Instructor',
    price: Number(c.priceAda ?? 0),
    duration: c.durationWeeks ? `${c.durationWeeks} wks` : 'Duration N/A',
    description: c.description,
    rating: c.averageRating ?? 0,
    students: c.enrollmentCount ?? 0,
  }));

  if (loading || connecting) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Connecting Wallet</h2>
          <p className="text-gray-600 dark:text-gray-300">Loading Cardano testnet wallet...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-red-600 to-orange-600 dark:bg-gray-900 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-6xl mb-4">:(</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Wallet Connection Error</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Could not initialize Cardano wallet. Please check your configuration.
            </p>
            <pre className="bg-red-50 p-4 rounded-lg text-red-700 text-sm overflow-auto whitespace-pre-wrap">{error}</pre>

            <div className="mt-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <h3 className="font-bold text-yellow-800 mb-2">Troubleshooting:</h3>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>Set NEXT_PUBLIC_BLOCKFROST_API_KEY (or NEXT_PUBLIC_BLOCKFROST_KEY) for testnet</li>
                <li>Restart the dev server after updating env</li>
                <li>Ensure .next cache was cleared if wasm errors persisted</li>
              </ul>
            </div>

            <div className="mt-4">
              <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition">
                Back to Home
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
              <h1 className="text-3xl font-bold text-blue-600 mb-2">Student Dashboard</h1>
              <div className="flex items-center space-x-2">
                <p className="text-gray-600 dark:text-gray-300 text-sm font-mono">
                  {address ? `${address.slice(0, 20)}...${address.slice(-10)}` : 'Not connected'}
                </p>
                <button
                  onClick={handleCopyAddress}
                  className="text-blue-600 hover:text-blue-700 font-bold text-sm"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center space-y-3 md:space-y-0 md:space-x-4">
              {/* Balance */}
              <div className="bg-blue-50 rounded-lg px-6 py-3 border-2 border-blue-200">
                <p className="text-sm text-blue-600 mb-1">Your Balance</p>
                <p className="text-2xl font-bold text-blue-800">{safeBalance.toFixed(2)} tADA</p>
              </div>

              {/* Wallet Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowSeedModal(true)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition whitespace-nowrap"
                >
                  View Seed Phrase
                </button>
                {safeBalance < 10 && (
                  <button
                    onClick={requestTestADA}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition whitespace-nowrap"
                  >
                    Faucet
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-8">
          <p className="text-yellow-800">
            <strong>Testnet Wallet:</strong> This is a testnet wallet. Your seed phrase is stored in browser localStorage. Make sure to back it up!
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          {/* Course List */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Available Courses</h2>

              <div className="space-y-4">
                {coursesLoading && (
                  <div className="animate-pulse space-y-4">
                    {[0, 1].map((i) => (
                      <div key={i} className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-3" />
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                      </div>
                    ))}
                  </div>
                )}

                {coursesError && !coursesLoading && (
                  <div className="border border-red-200 bg-red-50 text-red-700 rounded-xl p-4">
                    {coursesError}
                  </div>
                )}

                {!coursesLoading && !coursesError && visibleCourses.length === 0 && (
                  <div className="border border-gray-200 rounded-xl p-6 text-center text-gray-600">
                    No monetized courses available yet.
                  </div>
                )}

                {!coursesLoading &&
                  !coursesError &&
                  visibleCourses.map((course) => (
                    <div
                      key={course.id}
                      className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-1">{course.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">by {course.teacherName}</p>
                          <p className="text-gray-700 text-sm mb-3">{course.description}</p>
                        </div>

                        <div className="text-right ml-4">
                          <p className="text-2xl font-bold text-purple-600">{course.price} tADA</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-gray-600">
                        <div className="flex items-center">{course.duration}</div>
                        <div className="flex items-center">{course.rating} rating</div>
                        <div className="flex items-center">{course.students} students</div>
                      </div>

                      <button
                        onClick={() => setSelectedCourse(course)}
                        disabled={safeBalance < course.price}
                        className={`w-full font-bold py-3 px-6 rounded-lg transition ${
                          safeBalance < course.price
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {safeBalance < course.price ? 'Insufficient Balance' : 'Enroll Now'}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Payment/Wallet Section */}
          <div>
            {selectedCourse ? (
              <EscrowPayment
                course={selectedCourse}
                lucid={lucid}
                senderAddress={address}
                currentBalance={safeBalance}
                onPaymentComplete={handlePaymentComplete}
                onCancel={() => setSelectedCourse(null)}
              />
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="text-6xl mb-4">🎓</div>
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
                  View Seed Phrase
                </button>
                <button
                  onClick={() => setShowResetModal(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition"
                >
                  Reset Wallet
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* My Enrollments Section */}
        <div className="mt-8">
          <EnrollmentList
            enrollments={[
              {
                id: 'enroll_1',
                courseId: 'math_101',
                courseName: 'Advanced Mathematics 101',
                instructorName: 'Prof. Smith',
                enrolledAt: new Date('2023-10-15'),
                status: 'active',
                progress: 45,
                lastAccessed: new Date('2023-11-20'),
              },
            ]}
            emptyState={{
              title: 'No enrollments yet',
              description: 'You have not enrolled in any courses yet.',
              ctaText: 'Browse Courses',
              ctaHref: '/courses',
            }}
            onEnrollmentClick={(enrollment) => {
              router.push(`/courses/${enrollment.courseId}`);
            }}
          />
        </div>

        {/* Seed Phrase Modal */}
        {showSeedModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-3">Your Seed Phrase</h3>
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                <p className="text-red-800 font-bold">WARNING: NEVER SHARE YOUR SEED PHRASE!</p>
                <p className="text-red-700 text-sm mt-1">
                  Anyone with this phrase can access your wallet and funds.
                </p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <p className="font-mono text-sm break-all text-gray-800">{seedPhrase ?? 'No seed available'}</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleCopySeed}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                  Copy Seed
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
                <p className="text-red-800 font-bold mb-2">WARNING: This action is irreversible!</p>
                <p className="text-red-700 text-sm">
                  You will lose access to the current wallet and any funds in it unless you have saved the seed phrase.
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
