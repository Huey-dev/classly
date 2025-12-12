'use client';

import { useState } from "react";

type Props = {
  courseId: string;
  initialVisibility: string;
};

const OPTIONS: Array<{ label: string; value: string; tone: string }> = [
  { label: "Publish", value: "PUBLISHED", tone: "bg-emerald-600 text-white" },
  { label: "Unlist", value: "UNLISTED", tone: "bg-amber-500 text-white" },
  { label: "Draft", value: "DRAFT", tone: "bg-gray-200 text-gray-800" },
];

export function CourseVisibilityControls({ courseId, initialVisibility }: Props) {
  const [visibility, setVisibility] = useState(initialVisibility);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const update = async (value: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update visibility");
      setVisibility(data.visibility || value);
      setMessage(`Visibility set to ${data.visibility || value}`);
    } catch (e: any) {
      setMessage(e?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Course visibility</p>
        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
          {visibility}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => update(opt.value)}
            disabled={loading || visibility === opt.value}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${opt.tone} disabled:opacity-60`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {message && <p className="text-xs text-blue-600">{message}</p>}
    </div>
  );
}
