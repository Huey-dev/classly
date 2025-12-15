'use client';

import { useMemo, useState } from 'react';
import CourseCard from './CourseCard';

interface PaginatedProps {
  title: string;
  courses: any[];
  mode: 'student' | 'creator';
}

/**
 * PaginatedCourseGrid displays a section heading and shows a paginated grid of CourseCard components.
 * If there are more courses than the page size, next/previous buttons are shown.
 */
export default function PaginatedCourseGrid({ title, courses, mode }: PaginatedProps) {
  const pageSize = 3;
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(courses.length / pageSize));

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return courses.slice(start, start + pageSize);
  }, [courses, page]);

  if (!courses.length) return null;

  return (
    <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {Math.min(pageItems.length, pageSize)} of {courses.length}
          </p>
        </div>

        {/* Pagination controls only when needed */}
        {courses.length > pageSize && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-semibold bg-gray-50 dark:bg-gray-950 disabled:opacity-60"
            >
              Prev
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-semibold bg-gray-50 dark:bg-gray-950 disabled:opacity-60"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Course cards grid */}
      <div className="p-6 grid gap-4 md:grid-cols-2">
      {
        pageItems.map((course) => (
          <CourseCard key={course.id} course={course} mode={mode} />
        ))
      }
      </div>
    </section>
  );
}
