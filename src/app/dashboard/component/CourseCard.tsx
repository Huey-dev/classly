'use client';

import Link from 'next/link';

/**
 * CourseCard shows a single course in a grid.
 *
 * Props:
 * - course: the course object (created or enrolled)
 * - mode: 'creator' or 'student'
 *
 * When mode is 'creator', the card links to `/dashboard/courses/[id]` and shows the latest escrow snapshot.
 * When mode is 'student', it links to `/courses/[slug]` for the student to view the course.
 */
export default function CourseCard({ course, mode }: { course: any; mode: 'student' | 'creator' }) {
  const latestEscrow = course.escrowLinks?.[0];

  const href = mode === 'creator' ? `/dashboard/courses/${course.id}` : `/courses/${course.slug}`;

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden hover:shadow-lg transition"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:underline">
              {course.title}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enrollments: {course._count?.enrollments ?? 0} · Videos: {course._count?.contents ?? 0}
            </p>
          </div>

          <span
            className={[
              'px-2 py-1 rounded-full text-xs font-semibold border',
              mode === 'creator'
                ? 'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
            ].join(' ')}
          >
            {mode === 'creator' ? 'Creator' : 'Enrolled'}
          </span>
        </div>

        {/* When creator, show escrow status snapshot */}
        {mode === 'creator' && (
          <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Latest escrow snapshot</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Paid</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{String(latestEscrow?.paidCount ?? 0)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Released</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {latestEscrow?.released30 ? '30% ✓' : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Script</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {latestEscrow?.scriptAddress ? 'set' : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {mode === 'creator' ? 'View escrow →' : 'View course →'}
          </span>
          <span className="text-gray-400 group-hover:translate-x-0.5 transition">›</span>
        </div>
      </div>
    </Link>
  );
}
