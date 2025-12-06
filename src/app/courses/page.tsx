import Link from "next/link";

async function fetchCourses() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/courses/public`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export default async function CoursesPage() {
  const courses = await fetchCourses();
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-4 sm:px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Courses</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Browse available courses</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course: any) => (
            <Link
              key={course.id}
              href={`/course/${course.id}`}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm hover:shadow-md transition"
            >
              <div className="h-36 bg-gray-200 dark:bg-gray-700">
                {course.coverImage ? (
                  <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500" />
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold line-clamp-2">{course.title}</h2>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {course.priceAda ? `${course.priceAda} ADA` : "Free"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {course.description || "No description yet."}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{course.durationWeeks} wk</span>
                  <span aria-hidden="true">|</span>
                  <span>{course.videoCount} videos</span>
                  <span aria-hidden="true">|</span>
                  <span>Rating {course.averageRating ?? "N/A"}</span>
                  <span aria-hidden="true">|</span>
                  <span>{course.enrollmentCount} students</span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-sm text-gray-700 dark:text-gray-200">
                  {course.author?.image ? (
                    <img src={course.author.image} alt={course.author.name || "Author"} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold">
                      {course.author?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <span>{course.author?.name}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
