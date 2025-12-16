"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MuxPlayer from "@mux/mux-player-react";
import { Heart, UserPlus, UserCheck, ChevronDown, ChevronUp, MessageCircle } from "../../component/icons";

type Video = {

  id: string;

  title: string;

  description?: string | null;

  muxPlaybackId: string | null;

  muxAssetId?: string | null;

  createdAt: string;

  author: { id: string; name: string | null; image: string | null };

  mediaMetadata?: { duration?: number | null } | null;

  likes: number;

  courseId?: string | null;

  partNumber?: number | null;

  followerCount?: number;

  courseTitle?: string | null;

  isPaidCourse?: boolean;

};



type Related = { id: string; title: string; muxPlaybackId: string | null; duration: number | null; partNumber: number | null }[];



type Comment = { id: string; text: string; author: string; createdAt: string };

const isLikelyPlaybackId = (id?: string | null) =>
  !!id && /^[A-Za-z0-9]+$/.test(id) && id.length >= 10 && id.length <= 64;



export default function WatchClient({

  video,

  related,

  enrolled,

  previewLessonId: previewLessonIdProp,

}: { video: Video; related: Related; enrolled: boolean; previewLessonId?: string | null }) {

  const [likes, setLikes] = useState(video.likes);

  const [dislikes, setDislikes] = useState(0);

  const [disliked, setDisliked] = useState(false);

  const [liked, setLiked] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);

  const [commentText, setCommentText] = useState("");

  const [following, setFollowing] = useState(false);

  const [followerCount, setFollowerCount] = useState(video.followerCount ?? 0);

  const [isEnrolled, setIsEnrolled] = useState(enrolled);

  const [playlistOpen, setPlaylistOpen] = useState(true);

  const isPaidCourse = Boolean(video.courseId && video.isPaidCourse);

  const sortedRelated = useMemo(() => {
    return [...related].sort((a, b) => {
      const aPart = a.partNumber ?? Number.POSITIVE_INFINITY;
      const bPart = b.partNumber ?? Number.POSITIVE_INFINITY;
      if (aPart !== bPart) return aPart - bPart;
      return a.title.localeCompare(b.title);
    });
  }, [related]);

  const previewLessonId = useMemo(
    () => previewLessonIdProp ?? sortedRelated[0]?.id ?? video.id,
    [previewLessonIdProp, sortedRelated, video.id]
  );

  const isLocked = isPaidCourse && !isEnrolled && video.id !== previewLessonId;

  const isPreviewLesson = isPaidCourse && video.id === previewLessonId;



  useEffect(() => {

    // initial like/dislike/comments fetch

    (async () => {

      try {

        const [likeRes, commentRes] = await Promise.all([

          fetch(`/api/videos/${video.id}/like`),

          fetch(`/api/videos/${video.id}/comments`),

        ]);

        if (likeRes.ok) {

          const data = await likeRes.json();

          setLikes(data.likes ?? video.likes);

          setDislikes(data.dislikes ?? 0);

        }

        if (commentRes.ok) {

          const list: Comment[] = await commentRes.json();

          setComments(list);

        }

      } catch (e) {

        console.error("Failed to hydrate like/comment state", e);

      }

    })();

  }, [video.id, video.likes]);



  const toggleLike = async () => {

    setLiked((prev) => !prev);

    setDisliked(false);

    setLikes((prev) => (liked ? Math.max(0, prev - 1) : prev + 1));

    try {

      const action = liked ? "unlike" : "like";

      const res = await fetch(`/api/videos/${video.id}/like`, {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ action }),

      });

      if (res.ok) {

        const data = await res.json();

        setLikes(data.likes ?? likes);

        setDislikes(data.dislikes ?? dislikes);

      }

    } catch (e) {

      console.error("Like failed", e);

    }

  };



  const toggleDislike = async () => {

    const next = !disliked;

    setDisliked(next);

    setLiked(false);

    setDislikes((prev) => (next ? prev + 1 : Math.max(0, prev - 1)));

    if (liked) setLikes((prev) => Math.max(0, prev - 1));

    try {

      const action = disliked ? "undislike" : "dislike";

      const res = await fetch(`/api/videos/${video.id}/like`, {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ action }),

      });

      if (res.ok) {

        const data = await res.json();

        setLikes(data.likes ?? likes);

        setDislikes(data.dislikes ?? dislikes);

      }

    } catch (e) {

      console.error("Dislike failed", e);

    }

  };



  const addComment = async () => {

    const text = commentText.trim();

    if (!text) return;

    try {

      const res = await fetch(`/api/videos/${video.id}/comments`, {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ text }),

      });

      if (!res.ok) {

        console.error("Comment failed", await res.text());

        return;

      }

      const newComment: Comment = await res.json();

      setComments((prev) => [newComment, ...prev]);

      setCommentText("");

    } catch (e) {

      console.error("Comment failed", e);

    }

  };



  return (

    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-8">

        <section className="space-y-4">

          <div className="rounded-2xl overflow-hidden bg-black shadow-xl">

            {isLocked ? (

              <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-700 flex flex-col items-center justify-center text-center p-8 space-y-3">

                <div className="text-white text-lg font-semibold">

                  This lesson is part of {video.courseTitle || "a course"}.

                </div>

                <p className="text-sm text-gray-200">

                  Enroll to unlock this lesson and the rest of the curriculum. The first lesson is available as a free preview.

                </p>

                <Link

                  href={`/course/${video.courseId}`}

                  className="px-5 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"

                >

                  View course & enroll

                </Link>

              </div>

            ) : (

              <MuxPlayer

                playbackId={video.muxPlaybackId ?? undefined}

                streamType="on-demand"

                autoPlay

                accentColor="#2563eb"

                style={{ width: "100%", height: "100%" }}

              />

            )}

          </div>

          <div className="space-y-3 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">

            <div>

              <h1 className="text-lg md:text-xl font-semibold">{video.title}</h1>

              <p className="text-sm text-gray-500 dark:text-gray-400">

                {formatLikes(likes)} likes - {formatTimeSince(video.createdAt)}

              </p>

            {video.courseId && (

              <div className="mt-2 flex items-center gap-2 text-sm">

                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">

                  Course

                </span>

                <Link href={`/course/${video.courseId}`} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">

                  {video.courseTitle || "View course"}

                </Link>

                {isPreviewLesson && !isEnrolled && (

                  <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">

                    Preview lesson - free to watch

                  </span>

                )}

              </div>

            )}

            </div>

            <div className="flex items-center justify-between">

              <Link href={`/profile/${video.author.id}`} className="flex items-center gap-3 group">

                {video.author.image ? (

                  <img

                    src={video.author.image}

                    alt={video.author.name || "Author"}

                    className="w-10 h-10 rounded-full object-cover"

                  />

                ) : (

                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center font-semibold">

                    {video.author.name?.[0]?.toUpperCase() || "U"}

                  </div>

                )}

                <div>

                  <div className="font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">

                    {video.author.name}

                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">{followerCount} followers</div>

                </div>

              </Link>

              <button

                onClick={() => setFollowing((p) => !p)}

                className={`h-9 px-3 rounded-full transition-all transform hover:scale-105 flex items-center gap-1.5 flex-shrink-0 ${

                  following

                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"

                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"

                }`}

              >

                {following ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}

                {following ? "Following" : "Follow"}

              </button>

            </div>

            <div className="flex items-center gap-3 text-sm">

              <IconButton

                active={liked}

                onClick={toggleLike}

                icon={<Heart className={`w-4 h-4 ${liked ? "text-red-500" : ""}`} />}

                activeColor="text-red-500"

                label="Like"

              />

              <IconButton

                active={disliked}

                onClick={toggleDislike}

                icon={

                  <ThumbDown

                    className={`w-4 h-4 ${

                      disliked ? "text-black dark:text-white fill-black dark:fill-white" : ""

                    }`}

                  />

                }

                activeColor="text-black dark:text-white"

                label="Dislike"

              />

              <span className="text-xs text-gray-500 dark:text-gray-400">{formatLikes(likes)}</span>

              <span className="text-xs text-gray-500 dark:text-gray-400">{dislikes} dislikes</span>

            </div>

            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">

              <p>{video.description || "No description provided."}</p>

            </div>

          </div>



          <CommentsBlock

            comments={comments}

            addComment={addComment}

            commentText={commentText}

            setCommentText={setCommentText}

          />

        </section>



        <aside className="space-y-4">

          <div className="flex items-center justify-between gap-3">

            <div className="text-lg font-semibold">Course playlist</div>

            {sortedRelated.length > 0 && (

              <button

                onClick={() => setPlaylistOpen((prev) => !prev)}

                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-semibold"

              >

                <span>{playlistOpen ? "Hide" : "Show"}</span>

                {playlistOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}

              </button>

            )}

          </div>

          {playlistOpen && (

            <div className="space-y-3">

              {sortedRelated.length === 0 ? (

                <div className="text-sm text-gray-500 dark:text-gray-400">

                  No other parts in this course yet.

                </div>

              ) : (

                sortedRelated.map((item) => {

                  const isCurrent = item.id === video.id;

                  const itemLocked = isPaidCourse && !isEnrolled && item.id !== previewLessonId;

                  const badge = itemLocked

                    ? "Paid"

                    : isPaidCourse && item.id === previewLessonId

                    ? "Preview"

                    : null;

                  return (

                    <Link

                      key={item.id}

                      href={`/video/${item.id}`}

                      className={`flex gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition ${

                        isCurrent ? "bg-gray-100/60 dark:bg-gray-800/60" : ""

                      } ${itemLocked ? "opacity-80" : ""}`}

                    >

                        <div className="w-28 h-16 bg-black rounded-md overflow-hidden flex-shrink-0">
                          {isLikelyPlaybackId(item.muxPlaybackId) ? (
                            <img
                              src={`https://image.mux.com/${item.muxPlaybackId}/thumbnail.jpg?time=1`}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-700" />
                          )}
                        </div>

                      <div className="flex-1 min-w-0">

                        <p className="text-sm font-semibold line-clamp-2">

                          {item.title}

                        </p>

                        <p className="text-xs text-gray-500 dark:text-gray-400">

                          {formatDuration(item.duration)}

                        </p>

                      </div>

                      {badge && (

                        <span

                          className={`text-xs font-semibold px-2 py-1 rounded-full ${

                            badge === "Paid"

                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"

                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"

                          }`}

                        >

                          {badge}

                        </span>

                      )}

                    </Link>

                  );

                })

              )}

            </div>

          )}

        </aside>

      </div>

    </div>

  );

}



function CommentsBlock({

  comments,

  addComment,

  commentText,

  setCommentText,

}: {

  comments: Comment[];

  addComment: () => void;

  commentText: string;

  setCommentText: (v: string) => void;

}) {

  return (

    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">

      <div className="text-md font-semibold mb-3 flex items-center gap-2">

        <MessageCircle className="w-4 h-4" />

        Comments

        <span className="text-xs text-gray-500 dark:text-gray-400">-  {comments.length}</span>

      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">

        <input

          value={commentText}

          onChange={(e) => setCommentText(e.target.value)}

          onKeyDown={(e) => e.key === "Enter" && addComment()}

          placeholder="Add a comment..."

          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-w-0"

        />

        <button

          onClick={addComment}

          disabled={!commentText.trim()}

          className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-md w-full sm:w-auto text-center"

        >

          Post

        </button>

      </div>

      <div className="space-y-3 max-h-56 overflow-y-auto">

        {comments.length === 0 ? (

          <p className="text-xs text-gray-500 dark:text-gray-400 italic">No comments yet.</p>

        ) : (

          comments.map((c) => (

            <div key={c.id} className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-600">

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">

                <span>{c.author}</span>

                <span>{formatTimeSince(c.createdAt)}</span>

              </div>

              <div>{c.text}</div>

            </div>

          ))

        )}

      </div>

    </div>

  );

}



function IconButton({

  active,

  onClick,

  icon,

  label,

  activeColor,

}: {

  active: boolean;

  onClick: () => void;

  icon: React.ReactNode;

  label: string;

  activeColor: string;

}) {

  return (

    <button

      onClick={onClick}

      className={`px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-medium flex items-center gap-1 transition ${

        active ? `${activeColor} border-current` : "text-gray-700 dark:text-gray-200"

      }`}

    >

      {icon}

      {label}

    </button>

  );

}



function ThumbDown({ className = "w-4 h-4" }: { className?: string }) {

  return (

    <svg

      xmlns="http://www.w3.org/2000/svg"

      viewBox="0 0 24 24"

      fill="none"

      stroke="currentColor"

      strokeWidth="2"

      strokeLinecap="round"

      strokeLinejoin="round"

      className={className}

    >

      <path d="M14 15.89V19a3 3 0 0 1-3 3l-2-9V2h9.31a2 2 0 0 1 2 2l-1 7a2 2 0 0 1-2 2Z" />

      <path d="M7 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />

    </svg>

  );

}



function formatTimeSince(dateString: string) {

  const now = new Date();

  const then = new Date(dateString);

  const diff = Math.max(0, now.getTime() - then.getTime());



  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 60) return `${minutes || 1}m ago`;



  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;



  const days = Math.floor(hours / 24);

  if (days < 7) return `${days}d ago`;



  const weeks = Math.floor(days / 7);

  if (weeks < 4) return `${weeks}w ago`;



  const months = Math.floor(days / 30);

  if (months < 12) return `${months}mo ago`;



  const years = Math.floor(days / 365);

  return `${years}y ago`;

}



function formatLikes(count: number) {

  if (count < 1000) return `${count}`;

  if (count < 1_000_000) return `${(count / 1000).toFixed(count >= 100_000 ? 0 : 1)}K`;

  if (count < 1_000_000_000) return `${(count / 1_000_000).toFixed(count >= 100_000_000 ? 0 : 1)}M`;

  return `${(count / 1_000_000_000).toFixed(1)}B`;

}



function formatDuration(seconds: number | null) {

  if (seconds === null || Number.isNaN(seconds)) return "--:--";

  const total = Math.max(0, Math.floor(seconds));

  const h = Math.floor(total / 3600);

  const m = Math.floor((total % 3600) / 60);

  const s = total % 60;

  const mm = `${m}`.padStart(2, "0");

  const ss = `${s}`.padStart(2, "0");

  if (h > 0) {

    return `${h}:${mm}:${ss}`;

  }

  return `${m}:${ss}`;

}
