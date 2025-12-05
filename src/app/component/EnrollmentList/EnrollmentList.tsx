// src/app/components/EnrollmentList/EnrollmentList.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';

export interface Enrollment {
  id: string;
  courseId: string;
  courseName: string;
  instructorName: string;
  enrolledAt: Date;
  status: 'active' | 'completed' | 'pending';
  progress: number; // 0-100
  thumbnail?: string;
  lastAccessed?: Date;
}

interface EnrollmentListProps {
  enrollments: Enrollment[];
  emptyState?: {
    title: string;
    description: string;
    ctaText?: string;
    ctaHref?: string;
  };
  onEnrollmentClick?: (enrollment: Enrollment) => void;
  className?: string;
}

export function EnrollmentList({
  enrollments = [],
  emptyState = {
    title: 'No enrollments yet',
    description: 'You have not enrolled in any courses yet.',
    ctaText: 'Browse Courses',
    ctaHref: '/courses'
  },
  onEnrollmentClick,
  className = ''
}: EnrollmentListProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const filteredEnrollments = enrollments.filter(
    enrollment => activeTab === 'active' 
      ? enrollment.status !== 'completed' 
      : enrollment.status === 'completed'
  );

  if (enrollments.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center ${className}`}>
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
          {emptyState.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {emptyState.description}
        </p>
        {emptyState.ctaText && emptyState.ctaHref && (
          <Link
            href={emptyState.ctaHref}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            {emptyState.ctaText}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden ${className}`}>
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Active Courses
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'completed'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Completed
          </button>
        </nav>
      </div>

      {/* Enrollment List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {filteredEnrollments.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No {activeTab === 'active' ? 'active' : 'completed'} enrollments
          </div>
        ) : (
          filteredEnrollments.map((enrollment) => (
            <div
              key={enrollment.id}
              onClick={() => onEnrollmentClick?.(enrollment)}
              className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start">
                {enrollment.thumbnail ? (
                  <div className="flex-shrink-0 h-16 w-16 rounded-lg bg-gray-200 overflow-hidden mr-4">
                    <img
                      src={enrollment.thumbnail}
                      alt={enrollment.courseName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 h-16 w-16 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-2xl">
                    📚
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {enrollment.courseName}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Instructor: {enrollment.instructorName}
                  </p>
                  <div className="mt-2">
                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{enrollment.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${enrollment.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Enrolled on {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    {enrollment.lastAccessed && (
                      <span className="ml-3">
                        Last accessed {new Date(enrollment.lastAccessed).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}