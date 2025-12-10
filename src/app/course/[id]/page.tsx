import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { type ReactNode } from 'react';
import { prisma } from '../../../../lib/prisma';
import { getUserFromRequest } from '../../../../lib/auth/getUserFromRequest';
import { EnrollButton } from './EnrollButton';
import { ShareCourseBanner } from './ShareCourseBanner';
import { CourseShareTracker } from './CourseShareTracker';

type Section = {
  id: string;
  title: string;
  videos: SectionVideo[];
};

type SectionVideo = {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  videoUrl: string | null;
  partNumber: number | null;
};

type CourseContent = {
  id: string;
  title: string;
  description: string | null;
  muxPlaybackId: string | null;
  accessLevel: string | null;
  partNumber: number | null;
  mediaMetadata?: { duration: number | null } | null;
};

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : undefined;
  const rawRef = query?.ref;
  const referrerId =
    typeof rawRef === 'string'
      ? rawRef.trim()
      : Array.isArray(rawRef)
      ? rawRef[0]?.trim()
      : null;
  const sanitizedReferrerId =
    referrerId && /^[a-zA-Z0-9-]+$/.test(referrerId) && referrerId.length <= 100 ? referrerId : null;
  if (!id) {
    notFound();
  }
  const user = await getUserFromRequest();
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, image: true } },
      contents: {
        where: { type: 'VIDEO' },
        include: { mediaMetadata: { select: { duration: true } } },
        orderBy: [{ partNumber: 'asc' }, { createdAt: 'asc' }],
      },
      _count: { select: { enrollments: true, contents: true } },
    },
  });

  if (!course) {
    notFound();
  }
  if (course.visibility === 'DRAFT' && course.userId !== user?.id) {
    notFound();
  }

  const enrolled = user
    ? !!(await prisma.enrollment.findFirst({ where: { courseId: course.id, userId: user.id } }))
    : false;

  const sections = buildSections(course.contents);
  const videoCount = sections.reduce((sum, section) => sum + section.videos.length, 0);
  const totalDurationSeconds = sections.reduce(
    (sum, section) => sum + section.videos.reduce((inner, video) => inner + (video.duration ?? 0), 0),
    0
  );
  const durationLabel = formatDuration(totalDurationSeconds);
  const lastUpdated = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    course.updatedAt
  );
  const rating = course.averageRating ?? 0;
  const isFree = !course.isPaid || !course.priceAda || Number(course.priceAda) <= 0;
  const initialShareStats =
    course.userId === user?.id
      ? await prisma.courseShareStats.findUnique({
          where: { courseId_instructorId: { courseId: course.id, instructorId: course.userId } },
          select: { totalClicks: true, totalEnrollments: true, conversionRate: true },
        })
      : null;
  const normalizedShareStats = initialShareStats
    ? {
        totalClicks: initialShareStats.totalClicks ?? 0,
        totalEnrollments: initialShareStats.totalEnrollments ?? 0,
        conversionRate:
          initialShareStats.conversionRate && initialShareStats.conversionRate > 0
            ? Number(initialShareStats.conversionRate.toFixed(1))
            : initialShareStats.totalClicks > 0
            ? Number(((initialShareStats.totalEnrollments / initialShareStats.totalClicks) * 100).toFixed(2))
            : 0,
      }
    : null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <CourseShareTracker
        courseId={course.id}
        referrerId={sanitizedReferrerId}
        enabled={!!sanitizedReferrerId}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {course.userId === user?.id && (
          <ShareCourseBanner courseId={course.id} instructorId={course.userId} initialStats={normalizedShareStats} />
        )}
        <section className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-start bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wide">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                <IconPlay /> Course
              </span>
              {course.language && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  <IconBookmark /> {course.language}
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{course.title}</h1>
            <p className="text-slate-600 text-base leading-relaxed">
              {course.description || 'No description yet.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatTile label="Enrolled" value={`${course._count.enrollments.toLocaleString()} students`} icon={<IconUsers />} />
              <StatTile label="Rating" value={rating ? `${rating.toFixed(1)}/5` : 'New'} icon={<IconStar />} />
              <StatTile label="Duration" value={durationLabel} icon={<IconClock />} />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center">
                {course.author.image ? (
                  <Image
                    src={course.author.image}
                    alt={course.author.name || 'Author'}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-slate-700">
                    {course.author.name?.[0]?.toUpperCase() || 'A'}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{course.author.name || 'Author'}</p>
                <p className="text-xs text-slate-500">Last updated {lastUpdated}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#materials"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700"
              >
                <IconArrowRight /> View course content
              </a>
              {enrolled && <span className="text-sm text-emerald-600 font-semibold">Enrolled</span>}
              {!enrolled && !isFree && <span className="text-sm text-slate-600">Protected by escrow</span>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative w-full aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
              {course.coverImage ? (
                <Image
                  src={course.coverImage}
                  alt={course.title}
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <IconImage />
                  <p className="text-sm mt-2">No cover image yet</p>
                </div>
              )}
            </div>

            <div className="sticky top-24 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-slate-900">{isFree ? 'FREE' : `${Number(course.priceAda ?? 0)} ADA`}</div>
                {!isFree && <div className="text-xs text-slate-500">~$ {(Number(course.priceAda ?? 0) * 0.48).toFixed(2)}</div>}
              </div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700">
                <IconShield /> Protected by Escrow
              </div>
              <EnrollButton
                courseId={course.id}
                enrolled={enrolled}
                isOwner={course.userId === user?.id}
                priceAda={course.priceAda as number | null}
                userPresent={!!user}
              />
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex items-center gap-2"><IconCheck /> Lifetime access</div>
                <div className="flex items-center gap-2"><IconCheck /> Certificate on completion</div>
                <div className="flex items-center gap-2"><IconCheck /> Access on mobile and desktop</div>
              </div>
            </div>
          </div>
        </section>

        <section id="materials" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Course materials</h2>
              <p className="text-sm text-slate-600">
                {videoCount} video{videoCount === 1 ? '' : 's'} | {sections.length} section{sections.length === 1 ? '' : 's'}
              </p>
            </div>
            {course.userId === user?.id && videoCount === 0 && (
              <span className="text-xs text-slate-500">Add videos from the upload page to populate sections.</span>
            )}
          </div>

          {sections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-600">
              No videos yet. {course.userId === user?.id ? 'Upload lessons to populate this course.' : 'Check back soon.'}
            </div>
          ) : (
            <div className="space-y-3">
              {sections.map((section) => (
                <details key={section.id} className="group bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <summary className="flex items-center justify-between px-4 sm:px-6 py-4 cursor-pointer select-none">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <IconBookmark />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{section.title}</p>
                        <p className="text-xs text-slate-500">
                          {section.videos.length} video{section.videos.length === 1 ? '' : 's'}
                          {section.videos[0] ? ` • Next: ${section.videos[0].title}` : ''}
                        </p>
                      </div>
                    </div>
                    <IconChevron />
                  </summary>
                  <div className="divide-y divide-slate-100">
                    {section.videos.map((video) => (
                      <div key={video.id} className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
                            <IconPlay />
                          </div>
                          <div className="min-w-0">
                            <Link href={`/video/${video.id}`} className="font-semibold text-slate-900 hover:text-blue-600 line-clamp-2">
                              {video.title}
                            </Link>
                            {video.description && (
                              <p className="text-xs text-slate-500 line-clamp-2">{video.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-slate-600 tabular-nums">
                          {formatVideoDuration(video.duration)}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function buildSections(contents: CourseContent[]): Section[] {
  const map = new Map<string, Section>();
  contents.forEach((item, idx) => {
    const title = (item.accessLevel || 'General').trim() || 'General';
    if (!map.has(title)) {
      map.set(title, { id: `${title}-${idx}`, title, videos: [] });
    }
    const section = map.get(title)!;
    section.videos.push({
      id: item.id,
      title: item.title,
      description: item.description ?? null,
      duration: item.mediaMetadata?.duration ?? null,
      videoUrl: item.muxPlaybackId ? `https://stream.mux.com/${item.muxPlaybackId}.m3u8` : null,
      partNumber: item.partNumber,
    });
  });
  return Array.from(map.values());
}

function formatDuration(seconds: number) {
  if (!seconds) return '0m';
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

function formatVideoDuration(seconds: number | null) {
  if (seconds === null || seconds === undefined) return '--:--';
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

function StatTile({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-blue-600">
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

const IconPlay = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M10 8l6 4-6 4z" />
  </svg>
);

const IconBookmark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 4h12v17l-6-4-6 4z" />
  </svg>
);

const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const IconStar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 17.75L6.16 21l1.12-6.54L2 9.75l6.58-.96L12 3l3.42 5.79 6.58.96-4.78 4.71L17.84 21z" />
  </svg>
);

const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const IconArrowRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </svg>
);

const IconUpload = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <path d="M17 8l-5-5-5 5" />
    <path d="M12 3v12" />
  </svg>
);

const IconChevron = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const IconImage = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const IconShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
