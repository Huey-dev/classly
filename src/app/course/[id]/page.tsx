'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function CoursePage({ params }: { params: { id: string } }) {
  // Placeholder data; replace with real fetch to /api/courses/[id]
  const course = {
    id: params.id,
    title: 'Responsive Web Design',
    cover: '/cropped-logo.png',
    enrolled: '23,450',
    rating: 5,
    duration: '8h 15m',
    avgWatch: '3h 40m',
    author: 'John Smith',
    updated: 'March 1, 2023',
    materials: [
      'Introduction',
      'HTML Fundamentals',
      'CSS Fundamentals',
      'JavaScript Essentials',
    ],
  };

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Breadcrumbs */}
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <Link href="/courses" className="hover:underline">Courses</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">{course.title}</span>
        </div>

        {/* Hero */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold">{course.title}</h1>
            <div className="flex items-center gap-6 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <span>Enrolled</span>
                <span className="font-semibold">{course.enrolled}</span>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: course.rating }).map((_, i) => (
                  <span key={i}>⭐</span>
                ))}
              </div>
              <div>{course.duration}</div>
            </div>
            <button className="px-6 py-3 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 transition w-full md:w-auto">
              Enroll
            </button>
          </div>
          <div className="w-full bg-gray-100 rounded-xl p-4 flex items-center justify-center">
            <Image src={course.cover} alt={course.title} width={220} height={180} className="object-contain" />
          </div>
        </div>

        {/* Course Details */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900">Course Details</h2>
            <div className="space-y-1 text-sm text-gray-700">
              <div className="flex justify-between"><span>Average watch time</span><span>{course.avgWatch}</span></div>
              <div className="flex justify-between"><span>Average rating</span><span>{'⭐'.repeat(course.rating)}</span></div>
              <div className="flex justify-between"><span>Author</span><span>{course.author}</span></div>
              <div className="flex justify-between"><span>Last updated</span><span>{course.updated}</span></div>
            </div>
          </div>
        </section>

        {/* Course Materials */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900">Course Materials</h2>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {course.materials.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-4 py-3 border-t border-gray-200 first:border-t-0 hover:bg-gray-50"
              >
                <span className="font-medium text-gray-800">{item}</span>
                <span className="text-gray-400">›</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
