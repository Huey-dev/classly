export default function VideoGridSkeleton() {
  const placeholders = Array.from({ length: 9 });
  return (
    <div className="bg-white dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {placeholders.map((_, idx) => (
            <div
              key={idx}
              className="animate-pulse rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col h-full"
            >
              <div className="aspect-[16/9] bg-gray-200 dark:bg-gray-700" />
              <div className="p-3 space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
