'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  courseId: string;
  enrolled: boolean;
  isOwner: boolean;
  priceAda: number | null;
  userPresent: boolean;
};

export function EnrollButton({ courseId, enrolled, isOwner, priceAda, userPresent }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isOwner) {
    return (
      <button
        onClick={() => router.push(`/upload?courseId=${courseId}`)}
        className="w-full px-4 py-3 rounded-lg font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100"
      >
        Manage Course
      </button>
    );
  }

  if (!userPresent) {
    return (
      <button
        onClick={() => router.push(`/signin?redirect=/course/${courseId}`)}
        className="w-full px-4 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-md"
      >
        Sign in to Enroll
      </button>
    );
  }

  if (enrolled) {
    return (
      <button
        onClick={() => router.push(`/course/${courseId}/learn`)}
        className="w-full px-4 py-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700"
      >
        Continue Learning
      </button>
    );
  }

  const handleEnroll = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to enroll');
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to enroll');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="w-full px-4 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-md disabled:opacity-60"
      >
        {loading ? 'Enrolling...' : priceAda && priceAda > 0 ? `Enroll Now · ${priceAda} ADA` : 'Enroll for Free'}
      </button>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
