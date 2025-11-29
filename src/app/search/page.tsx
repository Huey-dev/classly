"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import VideoCard from "../../app/component/VideoCard";
import Link from "next/link";
interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  creator: string;
  duration?: string;
}
export default function SearchPage() {
  const params = useSearchParams();
  const q = params.get("q") || "";
  const [results, setResults] = useState<Video[]>([]);


  useEffect(() => {
    if (!q) return;

    async function search() {
      const res = await fetch(`/api/search/?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results);
    }

    search();
  }, [q]);

  return (
    <div className="px-4 py-8">
  <h1 className="text-xl font-semibold mb-4">
    Results for <span className="text-blue-500">{q}</span>
  </h1>

  {results.length === 0 ? (
    <p>No results found.</p>
  ) : (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {results.map((video) => (
        <Link key={video.id} href={`/video/${video.id}`}>
          <VideoCard video={video} />
        </Link>
      ))}
    </div>
  )}
</div>
  );
}
