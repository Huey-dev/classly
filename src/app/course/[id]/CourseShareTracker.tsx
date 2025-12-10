'use client';

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Props = {
  courseId: string;
  referrerId: string | null;
  enabled?: boolean;
  onStats?: (stats: { totalClicks: number; totalEnrollments: number; conversionRate: number }) => void;
};

export function CourseShareTracker({ courseId, referrerId, enabled = true, onStats }: Props) {
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (!enabled || !referrerId) return;
    if (fired.current) return;
    fired.current = true;

    const controller = new AbortController();

    fetch(`/api/courses/${courseId}/track-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: referrerId }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json().catch(() => null);
      })
      .then((data) => {
        if (!data) return;
        if (data.enrolled) {
          router.refresh();
        }
        if (data.stats && onStats) {
          onStats(data.stats);
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [courseId, enabled, onStats, referrerId, router]);

  return null;
}
