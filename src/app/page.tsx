import Link from "next/link";
import Image from "next/image";
import VideoGrid from "../app/component/VideoGrid";

export default function Page() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header - Fixed Navigation Bar */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm"> 
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* The root page logo links to the root page */}
            <Link href="/" className="flex items-center gap-3">
              {/* Assuming '/logo.png' exists in your /public directory */}
              <Image src="/logo.png" alt="logo" width={37} height={37} />
              <h1 className="text-xl font-bold">classly</h1>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/explore"
              className="font-medium text-blue-600 hover:text-blue-800 transition"
            >
              Explore
            </Link>
            <Link
              href="/dashboard"
              className="font-medium text-gray-700 hover:text-blue-600 transition"
            >
              My Videos
            </Link>
            <Link
              href="/upload"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Upload
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content: The reusable video feed component */}
      <VideoGrid />
    </div>
  );
}