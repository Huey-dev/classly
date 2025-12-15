'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import WalletOverview from '@/app/dashboard/component/WalletOverview';
import CourseCard from '@/app/dashboard/component/CourseCard';

type MeResponse = { id: string; name?: string | null; image?: string | null; email?: string | null; bannerImage?: string | null };
type DashboardData = { created: any[]; enrolled: any[] };

export default function ProfileMePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [data, setData] = useState<DashboardData>({ created: [], enrolled: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<'enrolled' | 'created'>('enrolled');

  const router = useRouter();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const [meRes, dashRes] = await Promise.all([fetch('/api/me'), fetch('/api/me/dashboard')]);
        if (!meRes.ok) throw new Error('Not signed in');
        const meJson = await meRes.json();
        const dashJson = dashRes.ok ? await dashRes.json() : { created: [], enrolled: [] };
        if (!alive) return;
        setMe(meJson);
        setData({ created: dashJson.created ?? [], enrolled: dashJson.enrolled ?? [] });
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? 'Failed to load profile');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow space-y-3 text-center">
          <p className="text-sm text-gray-700 dark:text-gray-300">You need to sign in to view your profile.</p>
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
            onClick={() => router.push('/signin')}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const banner = me.bannerImage || '/cover-default.jpg';
  const avatar = me.image || '/app-logo.png';
  const courses = tab === 'enrolled' ? data.enrolled : data.created;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-white dark:from-gray-900 dark:via-gray-950 dark:to-black">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <div className="rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-lg bg-white dark:bg-gray-900">
          <div className="relative h-40 bg-gray-200 dark:bg-gray-800">
            <Image src={banner} alt="Banner" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute -bottom-8 left-4 flex items-end gap-3">
              <div className="relative h-16 w-16 rounded-2xl border-4 border-white dark:border-gray-900 overflow-hidden bg-gray-100">
                <Image src={avatar} alt="Avatar" fill className="object-cover" sizes="64px" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{me.name || me.email}</p>
                <p className="text-xs text-gray-200">{me.email}</p>
              </div>
            </div>
          </div>
          <div className="pt-12 pb-4 px-4 flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
            <span>Wallet and courses at a glance</span>
            <button
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => router.push('/settings')}
            >
              Edit profile
            </button>
          </div>
        </div>

        {/* Wallet first for mobile */}
        <WalletOverview />

        {/* Courses tabs */}
        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="flex">
            {(['enrolled', 'created'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 px-4 py-3 text-sm font-semibold ${
                  tab === key
                    ? 'text-blue-600 dark:text-blue-300 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {key === 'enrolled' ? 'Enrolled Courses' : 'Created Courses'}
              </button>
            ))}
          </div>

          {err && (
            <div className="px-4 py-3 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20">
              {err}
            </div>
          )}

          {!courses.length ? (
            <div className="p-6 text-sm text-gray-600 dark:text-gray-300">
              {tab === 'enrolled' ? 'No enrollments yet.' : 'No courses created yet.'}
            </div>
          ) : (
            <div className="p-4 grid gap-3 md:grid-cols-2">
              {courses.map((course: any) => (
                <CourseCard key={course.id} course={course} mode={tab === 'enrolled' ? 'student' : 'creator'} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
